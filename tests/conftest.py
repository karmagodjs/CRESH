import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import pytest
from app.config import Settings
from app.ingestion.metadata import Chunk, ChunkMetadata, DocumentMetadata
from app.ingestion.parser import ParsedDocument, ParsedPage, ParsedSection
from app.models.cohere_client import CohereClient
from app.retrieval.bm25 import BM25Index
from app.retrieval.vector_store import QdrantVectorStore

@pytest.fixture
def mock_cohere_client():
    return CohereClient(api_key='mock')

@pytest.fixture
def in_memory_vector_store():
    return QdrantVectorStore(location=':memory:', collection_name='test_collection')

@pytest.fixture
def empty_bm25_index():
    return BM25Index()

@pytest.fixture
def sample_parsed_document():
    meta = DocumentMetadata(filename='test_paper.pdf', title='Attention Is All You Need', page_count=2, section_titles=['Abstract', 'Architecture', 'Conclusion'])
    pages = [ParsedPage(page_number=1, text='The dominant sequence models are based on complex RNNs.', char_count=55), ParsedPage(page_number=2, text='We propose the Transformer, a model architecture based on attention.', char_count=70)]
    sections = [ParsedSection(title='Abstract', content='We propose the Transformer, based solely on attention mechanisms.', page_start=1, page_end=1), ParsedSection(title='Architecture', content='The Transformer follows an encoder-decoder architecture using stacked self-attention and point-wise fully connected layers.\n\nMulti-head attention allows the model to jointly attend to information from different representation subspaces.', page_start=2, page_end=2)]
    return ParsedDocument(metadata=meta, pages=pages, sections=sections, full_text='Full text content...')
