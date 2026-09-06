from app.ingestion.chunker import FixedSizeChunker, StructureAwareChunker
from app.ingestion.parser import ParsedDocument

def test_structure_aware_chunker(sample_parsed_document: ParsedDocument):
    chunker = StructureAwareChunker(target_chunk_size=50, chunk_overlap=10)
    chunks = chunker.chunk_document(sample_parsed_document)
    assert len(chunks) >= 2
    for c in chunks:
        assert c.context_header.startswith('[Document: Attention Is All You Need')
        assert c.metadata.document_title == 'Attention Is All You Need'
        assert c.metadata.page_number in [1, 2]
        assert len(c.text) > 0

def test_fixed_size_chunker(sample_parsed_document: ParsedDocument):
    chunker = FixedSizeChunker(chunk_size=20, chunk_overlap=5)
    chunks = chunker.chunk_document(sample_parsed_document)
    assert len(chunks) > 0
    assert chunks[0].metadata.section_title == 'Fixed Chunk'
