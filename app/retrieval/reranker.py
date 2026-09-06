from typing import List, Optional
from pydantic import BaseModel, Field
from app.config import get_settings
from app.ingestion.metadata import ChunkMetadata
from app.models.cohere_client import CohereClient, get_cohere_client
from app.retrieval.vector_store import SearchResult
from app.observability.logging import get_logger
logger = get_logger('reranker')

class RerankedResult(BaseModel):
    chunk_id: str
    text: str
    context_header: str = ''
    initial_rank: int
    initial_score: float
    rerank_score: float
    rerank_rank: int
    metadata: ChunkMetadata
    dense_score: Optional[float] = None
    bm25_score: Optional[float] = None
    dense_rank: Optional[int] = None
    bm25_rank: Optional[int] = None
    entity_match_score: Optional[float] = None
    intent_match_score: Optional[float] = None
    section_match_score: Optional[float] = None
    answerability_score: Optional[float] = None
    specificity_score: Optional[float] = None
    final_evidence_score: Optional[float] = None
    selection_reason: Optional[str] = None

class CohereReranker:

    def __init__(self, client: Optional[CohereClient]=None, top_k: Optional[int]=None):
        self.client = client or get_cohere_client()
        settings = get_settings()
        self.top_k = top_k or settings.RERANK_TOP_K

    def rerank(self, query: str, candidates: List[SearchResult], top_n: Optional[int]=None) -> List[RerankedResult]:
        if not candidates:
            return []
        limit = top_n or self.top_k
        doc_texts = [f'{c.context_header}\n{c.text}' if c.context_header else c.text for c in candidates]
        rerank_items = self.client.rerank(query=query, documents=doc_texts, top_n=limit)
        results: List[RerankedResult] = []
        for new_rank, item in enumerate(rerank_items, 1):
            original = candidates[item.index]
            results.append(RerankedResult(
                chunk_id=original.chunk_id,
                text=original.text,
                context_header=original.context_header,
                initial_rank=original.rank,
                initial_score=original.score,
                rerank_score=item.relevance_score,
                rerank_rank=new_rank,
                metadata=original.metadata,
                dense_score=original.dense_score,
                bm25_score=original.bm25_score,
                dense_rank=original.dense_rank,
                bm25_rank=original.bm25_rank,
                selection_reason=original.selection_reason
            ))
        logger.info(f'Reranked {len(candidates)} candidates down to {len(results)} with top score {(results[0].rerank_score if results else 0.0)}')
        return results
