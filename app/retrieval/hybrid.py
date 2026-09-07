from typing import Any, Dict, List, Optional, Tuple
from app.config import get_settings
from app.models.cohere_client import CohereClient, get_cohere_client
from app.retrieval.bm25 import BM25Index, get_bm25_index
from app.retrieval.reranker import CohereReranker, RerankedResult
from app.retrieval.vector_store import SearchResult, VectorStore, get_vector_store
from app.observability.logging import get_logger
logger = get_logger('hybrid')

class HybridRetriever:

    def __init__(self, vector_store: Optional[VectorStore]=None, bm25_index: Optional[BM25Index]=None, cohere_client: Optional[CohereClient]=None, reranker: Optional[CohereReranker]=None):
        settings = get_settings()
        self.vector_store = vector_store or get_vector_store()
        self.bm25_index = bm25_index or get_bm25_index()
        self.cohere_client = cohere_client or get_cohere_client()
        self.reranker = reranker or CohereReranker(client=self.cohere_client)
        self.retrieval_top_k = getattr(settings, 'RETRIEVAL_TOP_K', 30)
        self.rerank_top_k = getattr(settings, 'RERANK_TOP_K', 10)
        self.dense_top_k = getattr(settings, 'DENSE_TOP_K', 30)
        self.bm25_top_k = getattr(settings, 'BM25_TOP_K', 30)
        self.enable_hybrid = settings.ENABLE_HYBRID_SEARCH
        self.bm25_weight = settings.BM25_WEIGHT
        self.dense_weight = settings.DENSE_WEIGHT

    def retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
        rerank_top_k: Optional[int] = None,
        document_id: Optional[str] = None,
        allowed_document_ids: Optional[List[str]] = None,
        enable_rerank: bool = True
    ) -> Tuple[List[SearchResult], List[RerankedResult]]:
        k = top_k or self.retrieval_top_k
        rk = rerank_top_k or self.rerank_top_k
        dense_k = max(k, self.dense_top_k)
        bm25_k = max(k, self.bm25_top_k)

        target_doc_ids: List[str] = []
        if allowed_document_ids:
            target_doc_ids = [did for did in allowed_document_ids if did]
        elif document_id:
            target_doc_ids = [document_id]

        if not target_doc_ids:
            logger.warning("HybridRetriever.retrieve: No selected document IDs provided. Aborting retrieval and reranking.")
            return ([], [])

        query_vectors = self.cohere_client.embed([query], input_type='search_query')
        dense_results: List[SearchResult] = []
        if query_vectors:
            dense_results = self.vector_store.similarity_search(
                query_vector=query_vectors[0],
                top_k=dense_k,
                allowed_document_ids=target_doc_ids
            )
        lexical_results: List[SearchResult] = []
        if self.enable_hybrid:
            lexical_results = self.bm25_index.search(
                query=query,
                top_k=bm25_k,
                allowed_document_ids=target_doc_ids
            )
        fused_candidates = self._reciprocal_rank_fusion(dense_results=dense_results, lexical_results=lexical_results, top_k=k)

        target_set = set(target_doc_ids)
        filtered_candidates = [c for c in fused_candidates if c.metadata.document_id in target_set]
        if len(filtered_candidates) != len(fused_candidates):
            logger.warning(f"Filtered out {len(fused_candidates) - len(filtered_candidates)} candidates outside document scope {target_doc_ids}")
        fused_candidates = filtered_candidates

        if not fused_candidates:
            logger.debug("HybridRetriever: Fused candidate list is empty. Skipping Cohere Rerank.")
            return ([], [])

        if not enable_rerank:
            fake_reranked = [
                RerankedResult(
                    chunk_id=c.chunk_id,
                    text=c.text,
                    context_header=c.context_header,
                    initial_rank=c.rank,
                    initial_score=c.score,
                    rerank_score=c.score,
                    rerank_rank=c.rank,
                    metadata=c.metadata,
                    dense_score=c.dense_score,
                    bm25_score=c.bm25_score,
                    dense_rank=c.dense_rank,
                    bm25_rank=c.bm25_rank
                )
                for c in fused_candidates[:rk]
            ]
            return (fused_candidates, fake_reranked)

        reranked = self.reranker.rerank(query=query, candidates=fused_candidates, top_n=rk)

        reranked = [r for r in reranked if r.metadata.document_id in target_set]
        return (fused_candidates, reranked)

    def retrieve_with_stages(
        self,
        query: str,
        top_k: Optional[int] = None,
        rerank_top_k: Optional[int] = None,
        document_id: Optional[str] = None,
        allowed_document_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
\
\
\
\
\
\

        k = top_k or self.retrieval_top_k
        rk = rerank_top_k or self.rerank_top_k
        dense_k = max(k, self.dense_top_k)
        bm25_k = max(k, self.bm25_top_k)

        target_doc_ids: List[str] = []
        if allowed_document_ids:
            target_doc_ids = [did for did in allowed_document_ids if did]
        elif document_id:
            target_doc_ids = [document_id]

        if not target_doc_ids:
            return {
                "dense_candidates": [],
                "bm25_candidates": [],
                "fused_candidates": [],
                "reranked_candidates": []
            }

        target_set = set(target_doc_ids)

        query_vectors = self.cohere_client.embed([query], input_type='search_query')
        dense_results: List[SearchResult] = []
        if query_vectors:
            dense_results = self.vector_store.similarity_search(
                query_vector=query_vectors[0],
                top_k=dense_k,
                allowed_document_ids=target_doc_ids
            )
            dense_results = [c for c in dense_results if c.metadata.document_id in target_set]

        lexical_results: List[SearchResult] = []
        if self.enable_hybrid:
            lexical_results = self.bm25_index.search(
                query=query,
                top_k=bm25_k,
                allowed_document_ids=target_doc_ids
            )
            lexical_results = [c for c in lexical_results if c.metadata.document_id in target_set]

        fused_candidates = self._reciprocal_rank_fusion(dense_results=dense_results, lexical_results=lexical_results, top_k=k)
        fused_candidates = [c for c in fused_candidates if c.metadata.document_id in target_set]

        reranked: List[RerankedResult] = []
        if fused_candidates:
            reranked = self.reranker.rerank(query=query, candidates=fused_candidates, top_n=rk)
            reranked = [r for r in reranked if r.metadata.document_id in target_set]

        return {
            "dense_candidates": dense_results,
            "bm25_candidates": lexical_results,
            "fused_candidates": fused_candidates,
            "reranked_candidates": reranked
        }

    def _reciprocal_rank_fusion(self, dense_results: List[SearchResult], lexical_results: List[SearchResult], top_k: int=30, rrf_k: int=60) -> List[SearchResult]:
        if not lexical_results:
            for rank, item in enumerate(dense_results, 1):
                item.rank = rank
                item.dense_rank = rank
                item.dense_score = item.score
            return dense_results[:top_k]
        if not dense_results:
            for rank, item in enumerate(lexical_results, 1):
                item.rank = rank
                item.bm25_rank = rank
                item.bm25_score = item.score
            return lexical_results[:top_k]
        chunk_pool: Dict[str, SearchResult] = {}
        rrf_scores: Dict[str, float] = {}
        dense_scores_map: Dict[str, float] = {}
        dense_ranks_map: Dict[str, int] = {}
        bm25_scores_map: Dict[str, float] = {}
        bm25_ranks_map: Dict[str, int] = {}

        for rank, res in enumerate(dense_results, 1):
            chunk_pool[res.chunk_id] = res
            rrf_scores[res.chunk_id] = rrf_scores.get(res.chunk_id, 0.0) + (1.0 / (rrf_k + rank))
            dense_scores_map[res.chunk_id] = res.score
            dense_ranks_map[res.chunk_id] = rank

        for rank, res in enumerate(lexical_results, 1):
            if res.chunk_id not in chunk_pool:
                chunk_pool[res.chunk_id] = res
            rrf_scores[res.chunk_id] = rrf_scores.get(res.chunk_id, 0.0) + (1.0 / (rrf_k + rank))
            bm25_scores_map[res.chunk_id] = res.score
            bm25_ranks_map[res.chunk_id] = rank

        sorted_chunk_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)
        fused: List[SearchResult] = []
        for new_rank, cid in enumerate(sorted_chunk_ids[:top_k], 1):
            item = chunk_pool[cid]
            fused.append(SearchResult(
                chunk_id=item.chunk_id,
                text=item.text,
                context_header=item.context_header,
                score=round(rrf_scores[cid] * 100, 4),
                metadata=item.metadata,
                rank=new_rank,
                dense_score=dense_scores_map.get(cid),
                bm25_score=bm25_scores_map.get(cid),
                dense_rank=dense_ranks_map.get(cid),
                bm25_rank=bm25_ranks_map.get(cid)
            ))
        return fused
        return fused
