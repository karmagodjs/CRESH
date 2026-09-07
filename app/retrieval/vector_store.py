import abc
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchAny, MatchValue, PointStruct, VectorParams
from app.config import get_settings
from app.ingestion.metadata import Chunk, ChunkMetadata
from app.observability.logging import get_logger
logger = get_logger('vector_store')

class SearchResult(BaseModel):
    chunk_id: str
    text: str
    context_header: str = ''
    score: float
    metadata: ChunkMetadata
    rank: int = 0
    dense_score: Optional[float] = None
    bm25_score: Optional[float] = None
    dense_rank: Optional[int] = None
    bm25_rank: Optional[int] = None
    selection_reason: Optional[str] = None

class VectorStore(abc.ABC):

    @abc.abstractmethod
    def add_chunks(self, chunks: List[Chunk]) -> int:
        pass

    @abc.abstractmethod
    def similarity_search(
        self,
        query_vector: List[float],
        top_k: int = 20,
        document_id: Optional[str] = None,
        allowed_document_ids: Optional[List[str]] = None
    ) -> List[SearchResult]:
        pass

    @abc.abstractmethod
    def delete_document(self, document_id: str) -> bool:
        pass

    @abc.abstractmethod
    def delete_documents(self, document_ids: List[str]) -> bool:
        pass

    @abc.abstractmethod
    def count(self) -> int:
        pass

    @abc.abstractmethod
    def health_check(self) -> Dict[str, Any]:
        pass

class QdrantVectorStore(VectorStore):

    def __init__(self, location: Optional[str]=None, collection_name: Optional[str]=None, api_key: Optional[str]=None, dimension: Optional[int]=None):
        settings = get_settings()
        self.location = location or settings.QDRANT_LOCATION
        self.collection_name = collection_name or settings.QDRANT_COLLECTION_NAME
        self.api_key = api_key or settings.QDRANT_API_KEY
        self.dimension = dimension or settings.EMBEDDING_DIMENSION
        self._chunk_map: Dict[Tuple[str, int], Chunk] = {}
        if self.location == ':memory:':
            self.client = QdrantClient(location=':memory:')
            logger.info('Initialized in-memory Qdrant instance.')
        elif self.location.startswith('http'):
            self.client = QdrantClient(url=self.location, api_key=self.api_key)
            logger.info(f'Connected to remote Qdrant at {self.location}')
        else:
            self.client = QdrantClient(path=self.location)
            logger.info(f'Initialized local Qdrant persistence at {self.location}')
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        try:
            collections = self.client.get_collections().collections
            existing = [c.name for c in collections]
            if self.collection_name not in existing:
                self.client.create_collection(collection_name=self.collection_name, vectors_config=VectorParams(size=self.dimension, distance=Distance.COSINE))
                logger.info(f"Created Qdrant collection '{self.collection_name}' (dim={self.dimension})")
        except Exception as e:
            logger.error(f'Failed to ensure Qdrant collection: {e}')

    def add_chunks(self, chunks: List[Chunk]) -> int:
        if not chunks:
            return 0
        points: List[PointStruct] = []
        for chunk in chunks:
            self._chunk_map[(chunk.metadata.document_id, chunk.metadata.chunk_index)] = chunk
            if not chunk.embedding:
                continue
            try:
                point_id = str(uuid.UUID(chunk.chunk_id))
            except ValueError:
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk.chunk_id))
            points.append(PointStruct(id=point_id, vector=chunk.embedding, payload=chunk.to_qdrant_payload()))
        if points:
            batch_size = 64
            for i in range(0, len(points), batch_size):
                batch = points[i:i + batch_size]
                self.client.upsert(collection_name=self.collection_name, points=batch)
        logger.info(f"Indexed {len(points)} chunks into Qdrant collection '{self.collection_name}'")
        return len(points)

    def similarity_search(
        self,
        query_vector: List[float],
        top_k: int = 20,
        document_id: Optional[str] = None,
        allowed_document_ids: Optional[List[str]] = None
    ) -> List[SearchResult]:
        target_doc_ids: List[str] = []
        if allowed_document_ids:
            target_doc_ids = [did for did in allowed_document_ids if did]
        elif document_id:
            target_doc_ids = [document_id]

        if not target_doc_ids:
            logger.warning("VectorStore.similarity_search: No selected document IDs provided. Refusing to query Qdrant collection without document scope filter.")
            return []

        if len(target_doc_ids) == 1:
            query_filter = Filter(must=[FieldCondition(key='document_id', match=MatchValue(value=target_doc_ids[0]))])
        else:
            query_filter = Filter(must=[FieldCondition(key='document_id', match=MatchAny(any=target_doc_ids))])

        try:
            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=top_k,
                query_filter=query_filter,
                with_payload=True
            )
            points = results.points
        except Exception as e:
            logger.error(f'Qdrant similarity_search failed: {e}')
            return []

        search_results: List[SearchResult] = []
        for rank, p in enumerate(points, 1):
            payload = p.payload or {}
            metadata = ChunkMetadata(
                chunk_id=payload.get('chunk_id', str(p.id)),
                document_id=payload.get('document_id', ''),
                document_title=payload.get('document_title', 'Unknown'),
                document_name=payload.get('document_name', payload.get('filename', '')),
                filename=payload.get('filename', ''),
                page_number=payload.get('page_number', 1),
                section=payload.get('section', payload.get('section_title', 'General')),
                section_title=payload.get('section_title', 'General'),
                section_name=payload.get('section_name', payload.get('section', 'General')),
                section_number=payload.get('section_number', ''),
                section_type=payload.get('section_type', 'other'),
                chunk_index=payload.get('chunk_index', 0),
                paragraph_index=payload.get('paragraph_index', 0),
                chunk_start=payload.get('chunk_start', payload.get('start_char', 0)),
                chunk_end=payload.get('chunk_end', payload.get('end_char', 0)),
                start_char=payload.get('start_char', 0),
                end_char=payload.get('end_char', 0),
                token_count=payload.get('token_count', 0),
                source=payload.get('source', '')
            )
            if target_doc_ids and metadata.document_id not in target_doc_ids:
                logger.warning(f"Vector search returned chunk {metadata.chunk_id} from doc {metadata.document_id} not in allowed {target_doc_ids}. Discarding.")
                continue
            search_results.append(
                SearchResult(
                    chunk_id=metadata.chunk_id,
                    text=payload.get('text', ''),
                    context_header=payload.get('context_header', ''),
                    score=float(p.score) if p.score is not None else 0.0,
                    metadata=metadata,
                    rank=rank
                )
            )
        return search_results

    def get_expanded_chunk(self, result: SearchResult, window: int = 1) -> SearchResult:
        doc_id = result.metadata.document_id
        idx = result.metadata.chunk_index
        if not doc_id:
            return result

        prev_chunk = self._chunk_map.get((doc_id, idx - 1))
        next_chunk = self._chunk_map.get((doc_id, idx + 1))

        parts = []
        if prev_chunk and (prev_chunk.metadata.section_name == result.metadata.section_name or prev_chunk.metadata.page_number == result.metadata.page_number):
            prev_paras = [p for p in prev_chunk.text.split('\n\n') if p.strip()]
            parts.append(prev_paras[-1] if len(prev_paras) > 1 else prev_chunk.text.strip())

        parts.append(result.text.strip())

        if next_chunk and (next_chunk.metadata.section_name == result.metadata.section_name or next_chunk.metadata.page_number == result.metadata.page_number):
            next_paras = [p for p in next_chunk.text.split('\n\n') if p.strip()]
            parts.append(next_paras[0] if len(next_paras) > 1 else next_chunk.text.strip())

        expanded_text = '\n\n'.join(parts)
        return SearchResult(
            chunk_id=result.chunk_id,
            text=expanded_text,
            context_header=result.context_header,
            score=result.score,
            rank=result.rank,
            metadata=result.metadata
        )

    def delete_document(self, document_id: str) -> bool:
        try:
            self.client.delete(collection_name=self.collection_name, points_selector=Filter(must=[FieldCondition(key='document_id', match=MatchValue(value=document_id))]))
            self._chunk_map = {k: v for k, v in self._chunk_map.items() if k[0] != document_id}
            logger.info(f"Deleted document '{document_id}' from Qdrant")
            return True
        except Exception as e:
            logger.error(f'Failed to delete document from Qdrant: {e}')
            return False

    def delete_documents(self, document_ids: List[str]) -> bool:
        if not document_ids:
            return True
        try:
            if len(document_ids) == 1:
                selector = Filter(must=[FieldCondition(key='document_id', match=MatchValue(value=document_ids[0]))])
            else:
                selector = Filter(must=[FieldCondition(key='document_id', match=MatchAny(any=document_ids))])
            self.client.delete(collection_name=self.collection_name, points_selector=selector)
            doc_set = set(document_ids)
            self._chunk_map = {k: v for k, v in self._chunk_map.items() if k[0] not in doc_set}
            logger.info(f"Deleted {len(document_ids)} documents from Qdrant")
            return True
        except Exception as e:
            logger.error(f'Failed to delete documents from Qdrant: {e}')
            return False

    def count(self) -> int:
        try:
            info = self.client.get_collection(self.collection_name)
            return info.points_count or 0
        except Exception:
            return 0

    def health_check(self) -> Dict[str, Any]:
        try:
            info = self.client.get_collection(self.collection_name)
            return {'status': 'healthy', 'backend': 'Qdrant', 'location': self.location, 'collection': self.collection_name, 'points_count': info.points_count, 'vector_size': self.dimension}
        except Exception as e:
            return {'status': 'unhealthy', 'backend': 'Qdrant', 'error': str(e)}
_vector_store_instance: Optional[VectorStore] = None

def get_vector_store() -> VectorStore:
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = QdrantVectorStore()
    return _vector_store_instance
