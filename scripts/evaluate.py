import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from rich.console import Console
from rich.table import Table
from app.evaluation.experiments import run_full_evaluation_suite
console = Console()

def main():
    console.print('[bold cyan]========================================================[/bold cyan]')
    console.print('[bold cyan]       Cohere Research Intelligence Evaluation Suite    [/bold cyan]')
    console.print('[bold cyan]========================================================[/bold cyan]\n')
    results = run_full_evaluation_suite(output_dir='evaluation/results')
    ret_table = Table(title='Retrieval Performance (IR Metrics)', show_header=True, header_style='bold magenta')
    ret_table.add_column('Experiment / Pipeline', style='cyan', width=36)
    ret_table.add_column('Recall@1', justify='right')
    ret_table.add_column('Recall@5', justify='right')
    ret_table.add_column('MRR', justify='right')
    ret_table.add_column('P@5', justify='right')
    ret_table.add_column('NDCG@5', justify='right')
    ret_table.add_column('Latency (ms)', justify='right')
    for r in results['retrieval']:
        ret_table.add_row(r['experiment_name'], f"{r['recall_at_1']:.3f}", f"{r['recall_at_5']:.3f}", f"{r['mrr']:.3f}", f"{r['precision_at_5']:.3f}", f"{r['ndcg_at_5']:.3f}", f"{r['avg_latency_ms']:.1f}ms")
    console.print(ret_table)
    console.print('\n')
    gen = results['generation']
    gen_table = Table(title='Generation & Grounding Quality (RAG)', show_header=True, header_style='bold green')
    gen_table.add_column('Metric', style='cyan')
    gen_table.add_column('Score / Value', justify='right')
    gen_table.add_row('Faithfulness (Grounding)', f"{gen['faithfulness']:.3f}")
    gen_table.add_row('Answer Relevance', f"{gen['answer_relevance']:.3f}")
    gen_table.add_row('Context Relevance', f"{gen['context_relevance']:.3f}")
    gen_table.add_row('Citation Precision', f"{gen['citation_precision']:.3f}")
    gen_table.add_row('Citation Completeness', f"{gen['citation_completeness']:.3f}")
    gen_table.add_row('Avg Generation Latency', f"{gen['avg_generation_latency_ms']:.1f}ms")
    gen_table.add_row('Estimated Cost / Query', f"${gen['avg_cost_usd_per_query']:.6f}")
    console.print(gen_table)
    console.print('\n')
    abl_table = Table(title='Ablation Studies', show_header=True, header_style='bold yellow')
    abl_table.add_column('Ablation Configuration', style='cyan', width=38)
    abl_table.add_column('Recall@5', justify='right')
    abl_table.add_column('MRR', justify='right')
    abl_table.add_column('NDCG@5', justify='right')
    abl_table.add_column('Latency', justify='right')
    for a in results['ablations']:
        abl_table.add_row(a['experiment_name'], f"{a['recall_at_5']:.3f}", f"{a['mrr']:.3f}", f"{a['ndcg_at_5']:.3f}", f"{a['avg_latency_ms']:.1f}ms")
    console.print(abl_table)
    console.print('\n[bold green]Benchmark evaluation results successfully written to evaluation/results/[/bold green]\n')
if __name__ == '__main__':
    main()
