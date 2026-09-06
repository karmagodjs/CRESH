import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from rich.console import Console
from rich.table import Table
from app.agent.graph import get_research_graph
from app.evaluation.datasets import EVALUATION_BENCHMARK_DATASET
console = Console()

def run_latency_cost_benchmark():
    console.print('[bold cyan]======================================================[/bold cyan]')
    console.print('[bold cyan]   Cohere Research Intelligence Latency & Cost Audit  [/bold cyan]')
    console.print('[bold cyan]======================================================[/bold cyan]\n')
    graph = get_research_graph()
    queries = EVALUATION_BENCHMARK_DATASET[:5]
    table = Table(title='Latency & Cost Breakdown per Query', show_header=True, header_style='bold magenta')
    table.add_column('Query ID', style='cyan', width=10)
    table.add_column('Query Type', style='white', width=14)
    table.add_column('Total Latency', justify='right')
    table.add_column('Analysis / Decomp', justify='right')
    table.add_column('Retrieval / Rerank', justify='right')
    table.add_column('Generation / Verif', justify='right')
    table.add_column('Est. Cost ($)', justify='right')
    total_time = 0.0
    total_cost = 0.0
    for q in queries:
        state = {'query': q.query, 'original_query': q.query, 'query_type': q.query_type, 'is_complex': q.query_type in ['comparative', 'multi-hop', 'analytical'], 'sub_questions': [], 'retrieved_documents': [], 'reranked_documents': [], 'evidence': [], 'evidence_sufficient': True, 'retrieval_attempt': 1, 'max_retrieval_attempts': 3, 'missing_evidence_summary': '', 'answer': '', 'key_points': [], 'citations': [], 'grounding': {}, 'confidence': 0.0, 'regeneration_attempt': 0, 'max_regeneration_attempts': 2, 'metadata': {}, 'errors': [], 'latency': {}, 'token_usage': {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0}, 'execution_trace': []}
        t0 = time.perf_counter()
        final_state = graph.invoke(state)
        elapsed = (time.perf_counter() - t0) * 1000
        lat = final_state.get('latency', {})
        tok = final_state.get('token_usage', {})
        p_tok = tok.get('prompt_tokens', 0)
        c_tok = tok.get('completion_tokens', 0)
        cost = p_tok * 2.5 / 1000000 + c_tok * 10.0 / 1000000
        analysis_ms = lat.get('query_analysis', 0.0) + lat.get('query_decomposition', 0.0)
        ret_ms = lat.get('retrieval_attempt_1', 0.0) + lat.get('reranking', 0.0)
        gen_ms = lat.get('generation_attempt_1', 0.0) + lat.get('verification', 0.0)
        total_time += elapsed
        total_cost += cost
        table.add_row(q.query_id, q.query_type, f'{elapsed:.1f}ms', f'{analysis_ms:.1f}ms', f'{ret_ms:.1f}ms', f'{gen_ms:.1f}ms', f'${cost:.6f}')
    console.print(table)
    avg_time = total_time / len(queries)
    avg_cost = total_cost / len(queries)
    summary_table = Table(title='Aggregate Summary', show_header=True, header_style='bold green')
    summary_table.add_column('Benchmark Metric', style='cyan')
    summary_table.add_column('Value', justify='right')
    summary_table.add_row('Average Total Latency', f'{avg_time:.2f}ms')
    summary_table.add_row('Average Cost per Query', f'${avg_cost:.6f}')
    summary_table.add_row('Queries / Dollar', f'{(int(1.0 / avg_cost) if avg_cost > 0 else 0):,}')
    console.print('\n')
    console.print(summary_table)
if __name__ == '__main__':
    run_latency_cost_benchmark()
