import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class DocumentMetadata(BaseModel):
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    title: str
    authors: List[str] = Field(default_factory=list)
    page_count: int = 1
    file_size_bytes: int = 0
    file_hash: str = ''
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    section_titles: List[str] = Field(default_factory=list)
    extra_metadata: Dict[str, Any] = Field(default_factory=dict)

class ChunkMetadata(BaseModel):
    chunk_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    document_title: str
    document_name: str = ''
    filename: str
    page_number: int
    section: str = ''
    section_title: str = 'General'
    section_name: str = ''
    section_number: str = ''
    section_type: str = 'other'
    chunk_index: int = 0
    paragraph_index: int = 0
    chunk_start: int = 0
    chunk_end: int = 0
    start_char: int = 0
    end_char: int = 0
    token_count: int = 0
    source: str = ''

    def model_post_init(self, __context: Any) -> None:
        if not self.document_name:
            self.document_name = self.filename
        if not self.section_name:
            self.section_name = self.section or self.section_title or 'General'
        if not self.section:
            self.section = self.section_name
        if not self.section_title or self.section_title == 'General':
            self.section_title = self.section_name
        if not self.chunk_start and self.start_char:
            self.chunk_start = self.start_char
        elif not self.start_char and self.chunk_start:
            self.start_char = self.chunk_start
        if not self.chunk_end and self.end_char:
            self.chunk_end = self.end_char
        elif not self.end_char and self.chunk_end:
            self.end_char = self.chunk_end

class Chunk(BaseModel):
    chunk_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    context_header: str = ''
    metadata: ChunkMetadata
    embedding: Optional[List[float]] = None

    @property
    def full_text(self) -> str:
        if self.context_header:
            return f'{self.context_header}\n{self.text}'
        return self.text

    def to_qdrant_payload(self) -> Dict[str, Any]:
        return {
            'chunk_id': self.chunk_id,
            'text': self.text,
            'context_header': self.context_header,
            'document_id': self.metadata.document_id,
            'document_title': self.metadata.document_title,
            'document_name': self.metadata.document_name or self.metadata.filename,
            'filename': self.metadata.filename,
            'page_number': self.metadata.page_number,
            'section': self.metadata.section or self.metadata.section_title,
            'section_title': self.metadata.section_title,
            'section_name': self.metadata.section_name or self.metadata.section,
            'section_number': self.metadata.section_number,
            'section_type': self.metadata.section_type,
            'chunk_index': self.metadata.chunk_index,
            'paragraph_index': self.metadata.paragraph_index,
            'chunk_start': self.metadata.chunk_start or self.metadata.start_char,
            'chunk_end': self.metadata.chunk_end or self.metadata.end_char,
            'start_char': self.metadata.start_char,
            'end_char': self.metadata.end_char,
            'token_count': self.metadata.token_count,
            'source': self.metadata.source
        }
