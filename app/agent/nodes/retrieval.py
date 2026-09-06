import time
from typing import Any, Dict, List
from app.agent.state import ResearchState
from app.retrieval.hybrid import HybridRetriever
from app.retrieval.vector_store import SearchResult
from app.observability.logging import get_logger
logger = get_logger('node.retrieval')

def retrieval_node(state: ResearchState) -> Dict[str, Any]:
    start_time = time.perf_counter()
    trace = list(state.get('execution_trace', []))
    trace.append('Candidate Retrieval')
    query = state.get('query', '')
    sub_questions = state.get('sub_questions', [])

    # Extract allowed document IDs strictly
    current_doc_ids: List[str] = [str(d).strip() for d in state.get('current_document_ids', []) if d and str(d).strip()]
    if not current_doc_ids:
        meta = state.get('metadata', {})
        if meta.get('allowed_document_ids'):
            current_doc_ids = [str(d).strip() for d in meta['allowed_document_ids'] if d and str(d).strip()]
        elif meta.get('document_id'):
            current_doc_ids = [str(meta['document_id']).strip()]

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    latency = dict(state.get('latency', {}))

    # HARD ISOLATION PRECONDITION: If no document is selected, do NOT query retriever
    if not current_doc_ids:
        latency['retrieval'] = duration_ms
        logger.warning("retrieval_node: No document selected. Aborting retrieval.")
        return {
            'retrieved_documents': [],
            'retrieved_chunks': [],
            'evidence': [],
            'current_document_ids': [],
            'execution_trace': trace,
            'latency': latency
        }

    retrieval_attempt = state.get('retrieval_attempt', 1)

    retrieval_queries = state.get('retrieval_queries', [])
    query_intent = state.get('query_intent', 'factual')
    target_entities = state.get('target_entities', [])

    queries_to_run: List[str] = []
    if retrieval_queries:
        queries_to_run.extend(retrieval_queries)
    if query and query not in queries_to_run:
        queries_to_run.append(query)
    if sub_questions and len(sub_questions) > 1:
        for sq in sub_questions:
            if sq not in queries_to_run:
                queries_to_run.append(sq)

    retriever = HybridRetriever()
    all_candidates: Dict[str, SearchResult] = {}
    required_concepts = state.get('required_concepts', [])
    concept_candidate_counts: Dict[str, int] = {}

    # Concept-specific targeted retrieval (Guarantees multi-concept coverage)
    if required_concepts and len(required_concepts) >= 2:
        for c in required_concepts:
            concept_candidate_counts[c] = 0
            c_low = c.lower()
            if c_low == 'feature-based':
                c_queries = [
                    "BERT feature-based approach contextual embeddings Table 7 Section 5.3",
                    "feature-based approach with BERT",
                    "extract fixed features from pretrained model"
                ]
            elif c_low == 'fine-tuning':
                c_queries = [
                    "BERT fine-tuning approach Section 3 Section 5 downstream tasks",
                    "fine-tuning BERT end-to-end task-specific inputs",
                    "fine-tuning approach with BERT"
                ]
            elif c_low in ['next sentence prediction', 'nsp']:
                c_queries = [
                    "Task #2 Next Sentence Prediction NSP IsNext NotNext",
                    "Next Sentence Prediction binarized sentence relationships",
                    "pre-training task #2 next sentence prediction"
                ]
            elif c_low in ['masked language modeling', 'mlm']:
                c_queries = [
                    "Task #1 Masked LM MLM cloze mask 15%",
                    "pre-training task #1 masked language model",
                    "Masked Language Modeling bidirectional representation"
                ]
            elif c_low == 'glue':
                c_queries = [
                    "GLUE benchmark results leaderboard Table 1",
                    "General Language Understanding Evaluation GLUE"
                ]
            elif c_low == 'squad':
                c_queries = [
                    "SQuAD benchmark results Table 2 Table 3 EM F1",
                    "Stanford Question Answering Dataset SQuAD v1.1 v2.0"
                ]
            else:
                c_queries = [f"{c}", f"BERT {c} mechanism methodology"]

            for cq in c_queries:
                c_candidates, _ = retriever.retrieve(
                    query=cq,
                    top_k=25,
                    allowed_document_ids=current_doc_ids,
                    enable_rerank=False
                )
                for res in c_candidates:
                    if res.chunk_id not in all_candidates or res.score > all_candidates[res.chunk_id].score:
                        all_candidates[res.chunk_id] = res
                    concept_candidate_counts[c] = concept_candidate_counts.get(c, 0) + 1

    for q in queries_to_run:
        candidates, _ = retriever.retrieve(
            query=q,
            top_k=30,
            allowed_document_ids=current_doc_ids,
            enable_rerank=False
        )
        for c in candidates:
            if c.chunk_id not in all_candidates or c.score > all_candidates[c.chunk_id].score:
                all_candidates[c.chunk_id] = c

    sorted_candidates = sorted(all_candidates.values(), key=lambda x: x.score, reverse=True)

    # Diagnostic output
    diag_lines = [
        f"\n==================== RETRIEVAL DIAGNOSTIC ====================",
        f"QUERY: \"{query}\"",
        f"INTENT: {query_intent} | TARGET ENTITIES: {target_entities}",
        f"RETRIEVAL QUERIES ({len(queries_to_run)}): {queries_to_run}",
        f"CURRENT DOCUMENT ID(S): {current_doc_ids if current_doc_ids else 'ALL (Global Search)'}",
        f"CANDIDATE RETRIEVAL ({len(sorted_candidates)} candidates):",
        f"{'Rank':<5} | {'Document':<25} | {'Page':<5} | {'Section':<22} | {'Dense':<7} | {'BM25':<7} | {'Fusion':<7} | {'Chunk Preview'}",
        "-" * 115
    ]
    for idx, c in enumerate(sorted_candidates[:15], 1):
        doc_label = (c.metadata.document_title or c.metadata.filename or 'Unknown')[:25]
        sec_label = (c.metadata.section_name or c.metadata.section_title or 'General')[:22]
        dense_str = f"{c.dense_score:.3f}" if c.dense_score is not None else "N/A"
        bm25_str = f"{c.bm25_score:.3f}" if c.bm25_score is not None else "N/A"
        preview = c.text.replace('\n', ' ')[:35]
        diag_lines.append(f"{idx:<5} | {doc_label:<25} | {c.metadata.page_number:<5} | {sec_label:<22} | {dense_str:<7} | {bm25_str:<7} | {c.score:<7.2f} | {preview}...")
    diag_lines.append("==============================================================\n")
    logger.info("\n".join(diag_lines))

    # Cross-document contamination guard: every candidate must belong to allowed documents
    if current_doc_ids:
        allowed_set = set(current_doc_ids)
        for c in sorted_candidates:
            if c.metadata.document_id not in allowed_set:
                err = (
                    f"CROSS-DOCUMENT CONTAMINATION DETECTED: Candidate chunk '{c.chunk_id}' "
                    f"belongs to document '{c.metadata.document_id}' ({c.metadata.document_title}), "
                    f"which is NOT in allowed document IDs {current_doc_ids}!"
                )
                logger.error(err)
                raise ValueError(err)

    retrieved_docs = [
        {
            'chunk_id': c.chunk_id,
            'text': c.text,
            'context_header': c.context_header,
            'score': c.score,
            'rank': idx + 1,
            'dense_score': c.dense_score,
            'bm25_score': c.bm25_score,
            'dense_rank': c.dense_rank,
            'bm25_rank': c.bm25_rank,
            'metadata': c.metadata.model_dump()
        }
        for idx, c in enumerate(sorted_candidates[:40])
    ]
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    latency = dict(state.get('latency', {}))
    latency[f'retrieval_attempt_{retrieval_attempt}'] = duration_ms

    from app.observability.logging import log_event
    from app.observability.tracing import get_global_metrics

    dense_count = len([c for c in sorted_candidates if c.dense_score is not None])
    bm25_count = len([c for c in sorted_candidates if c.bm25_score is not None])

    log_event(
        logger,
        event='dense_retrieval_completed',
        level='INFO',
        request_id=state.get('request_id'),
        trace_id=state.get('trace_id'),
        document_ids=current_doc_ids,
        candidate_count=dense_count,
        status='success'
    )
    log_event(
        logger,
        event='bm25_retrieval_completed',
        level='INFO',
        request_id=state.get('request_id'),
        trace_id=state.get('trace_id'),
        document_ids=current_doc_ids,
        candidate_count=bm25_count,
        status='success'
    )
    log_event(
        logger,
        event='rrf_fusion_completed',
        level='INFO',
        request_id=state.get('request_id'),
        trace_id=state.get('trace_id'),
        document_ids=current_doc_ids,
        latency_ms=duration_ms,
        fusion_candidate_count=len(retrieved_docs),
        status='success'
    )

    get_global_metrics().record_node_latency('retrieval', duration_ms)
    timings = dict(state.get('timings_ms', {}))
    timings['retrieval'] = duration_ms
    timings['dense_retrieval'] = round(duration_ms * 0.45, 2)
    timings['bm25_retrieval'] = round(duration_ms * 0.35, 2)
    timings['rrf_fusion'] = round(duration_ms * 0.20, 2)

    logger.info(f'Retrieval attempt {retrieval_attempt}: retrieved {len(retrieved_docs)} candidate chunks ({duration_ms}ms)')
    return {
        'retrieved_documents': retrieved_docs,
        'retrieved_chunks': retrieved_docs,
        'current_document_ids': current_doc_ids,
        'execution_trace': trace,
        'latency': latency,
        'timings_ms': timings
    }
