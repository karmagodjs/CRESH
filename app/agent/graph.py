from typing import Optional
from langgraph.graph import END, START, StateGraph
from app.agent.edges import route_document_scope, route_evidence_sufficiency, route_query_complexity, route_verification_result
from app.agent.nodes.citation import citation_node
from app.agent.nodes.decomposition import decomposition_node
from app.agent.nodes.document_scope import blocked_response_node, validate_document_scope_node
from app.agent.nodes.evidence_check import evidence_check_node, insufficient_evidence_node, query_refinement_node
from app.agent.nodes.generation import generation_node
from app.agent.nodes.query_analysis import query_analysis_node
from app.agent.nodes.reranking import reranking_node
from app.agent.nodes.retrieval import retrieval_node
from app.agent.nodes.verification import verification_node
from app.agent.state import ResearchState

def create_research_graph():
    workflow = StateGraph(ResearchState)
    workflow.add_node('validate_document_scope', validate_document_scope_node)
    workflow.add_node('blocked_response', blocked_response_node)
    workflow.add_node('query_analysis', query_analysis_node)
    workflow.add_node('decomposition', decomposition_node)
    workflow.add_node('retrieval', retrieval_node)
    workflow.add_node('reranking', reranking_node)
    workflow.add_node('evidence_check', evidence_check_node)
    workflow.add_node('insufficient_evidence', insufficient_evidence_node)
    workflow.add_node('query_refinement', query_refinement_node)
    workflow.add_node('generation', generation_node)
    workflow.add_node('citation', citation_node)
    workflow.add_node('verification', verification_node)

    # Entry point is the document scope validator guard
    workflow.add_edge(START, 'validate_document_scope')
    workflow.add_conditional_edges(
        'validate_document_scope',
        route_document_scope,
        {
            'blocked_response': 'blocked_response',
            'query_analysis': 'query_analysis'
        }
    )
    workflow.add_edge('blocked_response', END)

    workflow.add_conditional_edges('query_analysis', route_query_complexity, {'decomposition': 'decomposition', 'retrieval': 'retrieval'})
    workflow.add_edge('decomposition', 'retrieval')
    workflow.add_edge('retrieval', 'reranking')
    workflow.add_edge('reranking', 'evidence_check')
    workflow.add_conditional_edges(
        'evidence_check',
        route_evidence_sufficiency,
        {
            'generation': 'generation',
            'refinement': 'query_refinement',
            'insufficient_evidence': 'insufficient_evidence'
        }
    )
    workflow.add_edge('query_refinement', 'retrieval')
    workflow.add_edge('insufficient_evidence', END)
    workflow.add_edge('generation', 'citation')
    workflow.add_edge('citation', 'verification')
    workflow.add_conditional_edges('verification', route_verification_result, {'end': END, 'regenerate': 'generation'})
    return workflow.compile()
_graph_instance = None

def get_research_graph():
    global _graph_instance
    if _graph_instance is None:
        _graph_instance = create_research_graph()
    return _graph_instance
