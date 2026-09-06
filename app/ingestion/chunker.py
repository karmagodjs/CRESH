import re
import uuid
from typing import List
from app.ingestion.metadata import Chunk, ChunkMetadata, DocumentMetadata
from app.ingestion.parser import ParsedDocument, ParsedSection
from app.observability.logging import get_logger
logger = get_logger('chunker')

class StructureAwareChunker:

    def __init__(self, target_chunk_size: int=512, chunk_overlap: int=64):
        self.target_chunk_size = target_chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document(self, parsed_doc: ParsedDocument) -> List[Chunk]:
        chunks: List[Chunk] = []
        chunk_idx = 0
        for section in parsed_doc.sections:
            section_chunks = self._chunk_section(section=section, doc_metadata=parsed_doc.metadata, start_index=chunk_idx)
            chunks.extend(section_chunks)
            chunk_idx += len(section_chunks)
        logger.info(f'Created {len(chunks)} structure-aware chunks for document: {parsed_doc.metadata.title}')
        return chunks

    def _chunk_section(self, section: ParsedSection, doc_metadata: DocumentMetadata, start_index: int) -> List[Chunk]:
        paragraphs = [p.strip() for p in section.content.split('\n\n') if p.strip()]
        if not paragraphs:
            return []
        chunks: List[Chunk] = []
        current_paragraphs: List[str] = []
        current_words = 0
        current_idx = start_index
        start_char = section.start_char
        para_idx = 0

        for p_i, para in enumerate(paragraphs):
            para_words = len(para.split())
            if para_words > self.target_chunk_size:
                if current_paragraphs:
                    chunk_text = '\n\n'.join(current_paragraphs)
                    chunk = self._build_chunk(
                        text=chunk_text,
                        section=section,
                        doc_metadata=doc_metadata,
                        chunk_idx=current_idx,
                        para_idx=para_idx,
                        start_char=start_char,
                        end_char=start_char + len(chunk_text)
                    )
                    chunks.append(chunk)
                    start_char += len(chunk_text) + 2
                    current_idx += 1
                    current_paragraphs = []
                    current_words = 0

                sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', para) if s.strip()]
                sub_sents: List[str] = []
                sub_words = 0
                for s in sentences:
                    s_words = len(s.split())
                    if sub_words + s_words > self.target_chunk_size and sub_sents:
                        chunk_text = ' '.join(sub_sents)
                        chunk = self._build_chunk(
                            text=chunk_text,
                            section=section,
                            doc_metadata=doc_metadata,
                            chunk_idx=current_idx,
                            para_idx=p_i,
                            start_char=start_char,
                            end_char=start_char + len(chunk_text)
                        )
                        chunks.append(chunk)
                        start_char += len(chunk_text) + 1
                        current_idx += 1
                        sub_sents = []
                        sub_words = 0
                    sub_sents.append(s)
                    sub_words += s_words
                if sub_sents:
                    chunk_text = ' '.join(sub_sents)
                    chunk = self._build_chunk(
                        text=chunk_text,
                        section=section,
                        doc_metadata=doc_metadata,
                        chunk_idx=current_idx,
                        para_idx=p_i,
                        start_char=start_char,
                        end_char=start_char + len(chunk_text)
                    )
                    chunks.append(chunk)
                    start_char += len(chunk_text) + 2
                    current_idx += 1
                para_idx = p_i + 1
                continue

            if current_words + para_words > self.target_chunk_size:
                chunk_text = '\n\n'.join(current_paragraphs)
                chunk = self._build_chunk(
                    text=chunk_text,
                    section=section,
                    doc_metadata=doc_metadata,
                    chunk_idx=current_idx,
                    para_idx=para_idx,
                    start_char=start_char,
                    end_char=start_char + len(chunk_text)
                )
                chunks.append(chunk)
                start_char += len(chunk_text) + 2
                current_idx += 1
                current_paragraphs = [para]
                current_words = para_words
                para_idx = p_i
            else:
                if not current_paragraphs:
                    para_idx = p_i
                current_paragraphs.append(para)
                current_words += para_words

        if current_paragraphs:
            chunk_text = '\n\n'.join(current_paragraphs)
            chunk = self._build_chunk(
                text=chunk_text,
                section=section,
                doc_metadata=doc_metadata,
                chunk_idx=current_idx,
                para_idx=para_idx,
                start_char=start_char,
                end_char=start_char + len(chunk_text)
            )
            chunks.append(chunk)

        return chunks

    def _build_chunk(
        self,
        text: str,
        section: ParsedSection,
        doc_metadata: DocumentMetadata,
        chunk_idx: int,
        para_idx: int = 0,
        start_char: int = 0,
        end_char: int = 0
    ) -> Chunk:
        sec_name = section.section_name or section.title
        context_header = f'[Document: {doc_metadata.title} | Section: {sec_name} | Page: {section.page_start}]'
        word_count = len(text.split())
        approx_tokens = int(word_count * 1.3)
        metadata = ChunkMetadata(
            chunk_id=str(uuid.uuid4()),
            document_id=doc_metadata.document_id,
            document_title=doc_metadata.title,
            document_name=doc_metadata.filename,
            filename=doc_metadata.filename,
            page_number=section.page_start,
            section=section.title,
            section_title=section.title,
            section_name=sec_name,
            section_number=section.section_number,
            section_type=section.section_type,
            chunk_index=chunk_idx,
            paragraph_index=para_idx,
            chunk_start=start_char,
            chunk_end=end_char if end_char > start_char else start_char + len(text),
            start_char=start_char,
            end_char=end_char if end_char > start_char else start_char + len(text),
            token_count=approx_tokens,
            source=f'{doc_metadata.filename} - Page {section.page_start} - {sec_name}'
        )
        return Chunk(chunk_id=metadata.chunk_id, text=text, context_header=context_header, metadata=metadata)

class FixedSizeChunker:

    def __init__(self, chunk_size: int=1500, chunk_overlap: int=200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document(self, parsed_doc: ParsedDocument) -> List[Chunk]:
        full_text = parsed_doc.full_text
        chunks: List[Chunk] = []
        step = max(1, self.chunk_size - self.chunk_overlap)
        chunk_idx = 0
        for i in range(0, len(full_text), step):
            segment = full_text[i:i + self.chunk_size].strip()
            if not segment:
                continue
            metadata = ChunkMetadata(chunk_id=str(uuid.uuid4()), document_id=parsed_doc.metadata.document_id, document_title=parsed_doc.metadata.title, filename=parsed_doc.metadata.filename, page_number=1, section_title='Fixed Chunk', chunk_index=chunk_idx, start_char=i, end_char=i + len(segment), token_count=int(len(segment.split()) * 1.3), source=f'{parsed_doc.metadata.filename} - Offset {i}')
            chunks.append(Chunk(chunk_id=metadata.chunk_id, text=segment, context_header='', metadata=metadata))
            chunk_idx += 1
        return chunks
