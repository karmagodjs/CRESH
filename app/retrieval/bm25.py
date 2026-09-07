import re
from typing import Dict, List, Optional
from rank_bm25 import BM25Plus
from app.ingestion.metadata import Chunk
from app.retrieval.vector_store import SearchResult
from app.observability.logging import get_logger
logger = get_logger('bm25')

class BM25Index:

    def __init__(self):
        self.chunks: List[Chunk] = []
        self.corpus_tokens: List[List[str]] = []
        self.bm25: Optional[BM25Plus] = None
        self._doc_id_to_indices: Dict[str, List[int]] = {}

    def _tokenize(self, text: str) -> List[str]:
        return re.findall('[a-zA-Z0-9_\\-\\.]+', text.lower())

    def add_chunks(self, chunks: List[Chunk]) -> int:
        if not chunks:
            return 0
        self.chunks.extend(chunks)
        for chunk in chunks:
            tokens = self._tokenize(chunk.full_text)
            self.corpus_tokens.append(tokens)
        self.bm25 = BM25Plus(self.corpus_tokens)
        self._rebuild_mapping()
        logger.info(f'BM25 index updated with {len(chunks)} chunks. Total: {len(self.chunks)}')
        return len(chunks)

    def _rebuild_mapping() -> None:
        pass

    def _rebuild_mapping(self) -> None:
        self._doc_id_to_indices.clear()
        for idx, chunk in enumerate(self.chunks):
            doc_id = chunk.metadata.document_id
            if doc_id not in self._doc_id_to_indices:
                self._doc_id_to_indices[doc_id] = []
            self._doc_id_to_indices[doc_id].append(idx)

    def search(
        self,
        query: str,
        top_k: int = 20,
        document_id: Optional[str] = None,
        allowed_document_ids: Optional[List[str]] = None
    ) -> List[SearchResult]:
        if not self.bm25 or not self.chunks:
            return []
        tokens = self._tokenize(query)
        if not tokens:
            return []
        scores = self.bm25.get_scores(tokens)
        scored_pairs = list(enumerate(scores))

        target_doc_ids: List[str] = []
        if allowed_document_ids:
            target_doc_ids = [did for did in allowed_document_ids if did]
        elif document_id:
            target_doc_ids = [document_id]

        if not target_doc_ids:
            logger.warning("BM25Index.search: No selected document IDs provided. Refusing to search BM25 without document scope filter.")
            return []

        valid_indices = set()
        for did in target_doc_ids:
            valid_indices.update(self._doc_id_to_indices.get(did, []))
        scored_pairs = [p for p in scored_pairs if p[0] in valid_indices]

        query_set = set(tokens)
        valid_pairs = []
        for idx, s in scored_pairs:
            doc_token_set = set(self.corpus_tokens[idx])
            if s > 0.0 and query_set.intersection(doc_token_set):
                valid_pairs.append((idx, float(s)))
        valid_pairs.sort(key=lambda x: x[1], reverse=True)
        top_pairs = valid_pairs[:top_k]
        if not top_pairs:
            return []
        max_score = max([s for _, s in top_pairs], default=1.0) or 1.0
        results: List[SearchResult] = []
        for rank, (idx, raw_score) in enumerate(top_pairs, 1):
            chunk = self.chunks[idx]
            if target_doc_ids and chunk.metadata.document_id not in target_doc_ids:
                continue
            norm_score = float(raw_score / max_score)
            results.append(
                SearchResult(
                    chunk_id=chunk.chunk_id,
                    text=chunk.text,
                    context_header=chunk.context_header,
                    score=round(norm_score, 4),
                    metadata=chunk.metadata,
                    rank=rank
                )
            )
        return results

    def delete_document(self, document_id: str) -> bool:
        if document_id not in self._doc_id_to_indices:
            return False
        remaining_chunks = [c for c in self.chunks if c.metadata.document_id != document_id]
        self.chunks = remaining_chunks
        self.corpus_tokens = [self._tokenize(c.full_text) for c in self.chunks]
        self.bm25 = BM25Plus(self.corpus_tokens) if self.corpus_tokens else None
        self._rebuild_mapping()
        logger.info(f"Deleted document '{document_id}' from BM25 index. Remaining: {len(self.chunks)}")
        return True

    def delete_documents(self, document_ids: List[str]) -> bool:
        if not document_ids:
            return True
        target_set = set(document_ids)
        self.chunks = [c for c in self.chunks if c.metadata.document_id not in target_set]
        self.corpus_tokens = [self._tokenize(c.full_text) for c in self.chunks]
        self.bm25 = BM25Plus(self.corpus_tokens) if self.corpus_tokens else None
        self._rebuild_mapping()
        logger.info(f"Deleted {len(document_ids)} documents from BM25 index. Remaining: {len(self.chunks)}")
        return True

    def count(self) -> int:
        return len(self.chunks)
_bm25_index_instance: Optional[BM25Index] = None

def get_bm25_index() -> BM25Index:
    global _bm25_index_instance
    if _bm25_index_instance is None:
        _bm25_index_instance = BM25Index()
    return _bm25_index_instance
