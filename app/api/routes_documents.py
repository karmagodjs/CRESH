import os
import shutil
from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from app.api.schemas import DocumentListResponse, DocumentResponse
from app.config import get_settings
from app.ingestion.chunker import StructureAwareChunker
from app.ingestion.metadata import DocumentMetadata
from app.ingestion.parser import PDFParser
from app.models.cohere_client import get_cohere_client
from app.retrieval.bm25 import get_bm25_index
from app.retrieval.vector_store import get_vector_store
from app.observability.logging import get_logger
logger = get_logger('routes.documents')
router = APIRouter(prefix='/documents', tags=['Documents'])
_DOCUMENT_REGISTRY: Dict[str, DocumentResponse] = {}

def get_document_registry() -> Dict[str, DocumentResponse]:
    return _DOCUMENT_REGISTRY

def ingest_document_safely(file_bytes: bytes, filename: str) -> DocumentResponse:
    settings = get_settings()
    parser = PDFParser()
    parsed_doc = parser.parse_bytes(file_bytes=file_bytes, filename=filename)
    chunker = StructureAwareChunker(target_chunk_size=settings.CHUNK_SIZE, chunk_overlap=settings.CHUNK_OVERLAP)
    chunks = chunker.chunk_document(parsed_doc)
    if not chunks:
        raise ValueError('Could not extract any readable text segments from the document.')

    vector_store = get_vector_store()
    bm25_index = get_bm25_index()

    # SAFE REINDEX: Delete any existing chunks for this document_id before inserting to prevent duplicates
    vector_store.delete_document(parsed_doc.metadata.document_id)
    bm25_index.delete_document(parsed_doc.metadata.document_id)

    cohere_client = get_cohere_client()
    chunk_texts = [c.full_text for c in chunks]
    embeddings = cohere_client.embed(chunk_texts, input_type='search_document')
    for chunk, emb in zip(chunks, embeddings):
        chunk.embedding = emb

    vector_store.add_chunks(chunks)
    bm25_index.add_chunks(chunks)

    doc_response = DocumentResponse(
        document_id=parsed_doc.metadata.document_id,
        filename=parsed_doc.metadata.filename,
        title=parsed_doc.metadata.title,
        page_count=parsed_doc.metadata.page_count,
        chunk_count=len(chunks),
        created_at=parsed_doc.metadata.created_at,
        file_size_bytes=parsed_doc.metadata.file_size_bytes,
        section_titles=parsed_doc.metadata.section_titles
    )
    _DOCUMENT_REGISTRY[doc_response.document_id] = doc_response
    logger.info(f'Safely ingested and indexed document: {doc_response.title} ({len(chunks)} chunks, ID: {doc_response.document_id})')
    return doc_response

@router.post('/upload', response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile=File(...)) -> DocumentResponse:
    settings = get_settings()
    filename = file.filename or 'unknown.pdf'
    ext = Path(filename).suffix.lower()
    if ext not in ['.pdf', '.txt', '.md']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported file format '{ext}'. Only .pdf, .txt, and .md files are supported.")
    file_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f'File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.')
    try:
        return ingest_document_safely(file_bytes=file_bytes, filename=filename)
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to process uploaded file '{filename}': {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f'Failed to process and index document: {str(e)}')

@router.get('', response_model=DocumentListResponse)
def list_documents() -> DocumentListResponse:
    docs = list(_DOCUMENT_REGISTRY.values())
    total_chunks = sum((d.chunk_count for d in docs))
    return DocumentListResponse(documents=docs, total_documents=len(docs), total_chunks=total_chunks)

@router.delete('/{document_id}', status_code=status.HTTP_200_OK)
def delete_document(document_id: str) -> Dict[str, Any]:
    if document_id not in _DOCUMENT_REGISTRY:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document with ID '{document_id}' not found.")
    vector_store = get_vector_store()
    bm25_index = get_bm25_index()
    vector_store.delete_document(document_id)
    bm25_index.delete_document(document_id)
    doc_info = _DOCUMENT_REGISTRY.pop(document_id)
    logger.info(f"Deleted document '{doc_info.title}' (ID: {document_id})")
    return {'status': 'success', 'message': f"Document '{doc_info.title}' deleted successfully.", 'deleted_document_id': document_id}
