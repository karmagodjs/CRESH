import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple
import pandas as pd
from app.agent.graph import get_research_graph
from app.config import get_settings
from app.evaluation.datasets import EVALUATION_BENCHMARK_DATASET, EvaluationQuery
from app.evaluation.generation_metrics import GenerationEvaluationSummary, evaluate_generation_run
from app.evaluation.retrieval_metrics import RetrievalEvaluationSummary, evaluate_retrieval_run
from app.ingestion.chunker import FixedSizeChunker, StructureAwareChunker
from app.ingestion.parser import PDFParser
from app.models.cohere_client import get_cohere_client
from app.retrieval.bm25 import BM25Index, get_bm25_index
from app.retrieval.hybrid import HybridRetriever
from app.retrieval.reranker import CohereReranker
from app.retrieval.vector_store import QdrantVectorStore, get_vector_store
from app.observability.logging import get_logger
logger = get_logger('evaluation.experiments')

def setup_benchmark_environment(chunking_mode: str='structure_aware') -> None:
    sample_dir = Path('data/sample_papers')
    if not sample_dir.exists():
        logger.warning(f'Sample papers directory {sample_dir} not found.')
        return
    vector_store = get_vector_store()
    bm25_index = get_bm25_index()
    cohere_client = get_cohere_client()
    parser = PDFParser()
    if chunking_mode == 'structure_aware':
        chunker = StructureAwareChunker(target_chunk_size=512, chunk_overlap=64)
    else:
        chunker = FixedSizeChunker(chunk_size=1200, chunk_overlap=150)
    for paper_file in sample_dir.glob('*.txt'):
        with open(paper_file, 'rb') as f:
            data = f.read()
        parsed_doc = parser.parse_bytes(file_bytes=data, filename=paper_file.name)
        chunks = chunker.chunk_document(parsed_doc)
        embeddings = cohere_client.embed([c.full_text for c in chunks], input_type='search_document')
        for c, emb in zip(chunks, embeddings):
            c.embedding = emb
        vector_store.add_chunks(chunks)
        bm25_index.add_chunks(chunks)
    logger.info(f"Loaded and indexed benchmark corpus with mode='{chunking_mode}'. Total vectors: {vector_store.count()}")

def run_retrieval_experiment_dense_only(queries: List[EvaluationQuery]) -> RetrievalEvaluationSummary:
    cohere_client = get_cohere_client()
    vector_store = get_vector_store()
    results: List[List[Any]] = []
    latencies: List[float] = []
    for q in queries:
        t0 = time.perf_counter()
        q_vec = cohere_client.embed([q.query], input_type='search_query')[0]
        search_res = vector_store.similarity_search(query_vector=q_vec, top_k=5)
        latencies.append((time.perf_counter() - t0) * 1000)
        results.append(search_res)
    return evaluate_retrieval_run('Experiment A: Dense Only', queries, results, latencies)

def run_retrieval_experiment_dense_rerank(queries: List[EvaluationQuery]) -> RetrievalEvaluationSummary:
    cohere_client = get_cohere_client()
    vector_store = get_vector_store()
    reranker = CohereReranker(client=cohere_client, top_k=5)
    results: List[List[Any]] = []
    latencies: List[float] = []
    for q in queries:
        t0 = time.perf_counter()
        q_vec = cohere_client.embed([q.query], input_type='search_query')[0]
        candidates = vector_store.similarity_search(query_vector=q_vec, top_k=20)
        reranked = reranker.rerank(query=q.query, candidates=candidates, top_n=5)
        latencies.append((time.perf_counter() - t0) * 1000)
        results.append(reranked)
    return evaluate_retrieval_run('Experiment B: Dense + Cohere Rerank', queries, results, latencies)

def run_retrieval_experiment_hybrid_rerank(queries: List[EvaluationQuery]) -> RetrievalEvaluationSummary:
    retriever = HybridRetriever()
    results: List[List[Any]] = []
    latencies: List[float] = []
    for q in queries:
        t0 = time.perf_counter()
        _, reranked = retriever.retrieve(query=q.query, top_k=20, rerank_top_k=5, enable_rerank=True)
        latencies.append((time.perf_counter() - t0) * 1000)
        results.append(reranked)
    return evaluate_retrieval_run('Experiment C: Hybrid + Cohere Rerank', queries, results, latencies)

def run_full_evaluation_suite(output_dir: str='evaluation/results') -> Dict[str, Any]:
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    queries = EVALUATION_BENCHMARK_DATASET
    logger.info(f'Starting evaluation on {len(queries)} research benchmark queries...')
    setup_benchmark_environment('structure_aware')
    exp_a = run_retrieval_experiment_dense_only(queries)
    exp_b = run_retrieval_experiment_dense_rerank(queries)
    exp_c = run_retrieval_experiment_hybrid_rerank(queries)
    retrieval_summaries = [exp_a, exp_b, exp_c]
    retrieval_df = pd.DataFrame([s.model_dump() for s in retrieval_summaries])
    retrieval_df.to_csv(out_path / 'retrieval_benchmark.csv', index=False)
    graph = get_research_graph()
    answers: List[str] = []
    all_citations: List[List[Dict[str, Any]]] = []
    all_evidence: List[List[Dict[str, Any]]] = []
    all_groundings: List[Dict[str, Any]] = []
    gen_latencies: List[float] = []
    token_usages: List[Dict[str, int]] = []
    for q in queries:
        t0 = time.perf_counter()
        state = {'query': q.query, 'original_query': q.query, 'query_type': q.query_type, 'is_complex': q.query_type in ['comparative', 'multi-hop', 'analytical'], 'sub_questions': [], 'retrieved_documents': [], 'reranked_documents': [], 'evidence': [], 'evidence_sufficient': True, 'retrieval_attempt': 1, 'max_retrieval_attempts': 3, 'missing_evidence_summary': '', 'answer': '', 'key_points': [], 'citations': [], 'grounding': {}, 'confidence': 0.0, 'regeneration_attempt': 0, 'max_regeneration_attempts': 2, 'metadata': {}, 'errors': [], 'latency': {}, 'token_usage': {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0}, 'execution_trace': []}
        final_state = graph.invoke(state)
        gen_latencies.append((time.perf_counter() - t0) * 1000)
        answers.append(final_state.get('answer', ''))
        all_citations.append(final_state.get('citations', []))
        all_evidence.append(final_state.get('evidence', []))
        all_groundings.append(final_state.get('grounding', {}))
        token_usages.append(final_state.get('token_usage', {'prompt_tokens': 0, 'completion_tokens': 0}))
    gen_summary = evaluate_generation_run(experiment_name='Full LangGraph RAG Agent', queries=queries, answers=answers, all_citations=all_citations, all_evidence=all_evidence, all_groundings=all_groundings, latencies_ms=gen_latencies, token_usages=token_usages)
    gen_df = pd.DataFrame([gen_summary.model_dump()])
    gen_df.to_csv(out_path / 'generation_benchmark.csv', index=False)
    setup_benchmark_environment('fixed_size')
    ablation_fixed = run_retrieval_experiment_hybrid_rerank(queries)
    ablation_fixed.experiment_name = 'Ablation 2: Fixed Chunking'
    setup_benchmark_environment('structure_aware')
    ablation_structure = run_retrieval_experiment_hybrid_rerank(queries)
    ablation_structure.experiment_name = 'Ablation 2: Structure-Aware Chunking'
    ablations_df = pd.DataFrame([exp_a.model_dump(), exp_b.model_dump(), ablation_fixed.model_dump(), ablation_structure.model_dump()])
    ablations_df.to_csv(out_path / 'ablations_benchmark.csv', index=False)
    results_data = {'retrieval': [exp_a.model_dump(), exp_b.model_dump(), exp_c.model_dump()], 'generation': gen_summary.model_dump(), 'ablations': [exp_a.model_dump(), exp_b.model_dump(), ablation_fixed.model_dump(), ablation_structure.model_dump()]}
    with open(out_path / 'evaluation_results.json', 'w') as f:
        json.dump(results_data, f, indent=2)
    logger.info(f'Evaluation complete! Saved benchmark reports to {out_path}')
    return results_data
