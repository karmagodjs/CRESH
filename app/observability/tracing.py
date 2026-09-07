import time
import uuid
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

class TraceSpan(BaseModel):
    name: str
    start_time: float
    end_time: Optional[float] = None
    duration_ms: float = 0.0
    status: str = 'running'
    metadata: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None

    def finish(self, status: str = 'success', error: Optional[str] = None) -> None:
        self.end_time = time.perf_counter()
        self.duration_ms = round((self.end_time - self.start_time) * 1000, 2)
        self.status = status
        self.error = error

class ModelCallRecord(BaseModel):

    provider: str = 'cohere'
    model: str
    operation: str
    request_count: int = 1
    input_tokens: Union[int, str] = 'unavailable'
    output_tokens: Union[int, str] = 'unavailable'
    estimated_cost_usd: float = 0.0
    failures: int = 0
    retries: int = 0
    latency_ms: float = 0.0
    status: str = 'success'

def compute_percentiles(values: List[float]) -> Dict[str, float]:

    if not values:
        return {'mean': 0.0, 'p50': 0.0, 'p95': 0.0, 'p99': 0.0}
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    mean_val = sum(sorted_vals) / n

    def get_pct(p: float) -> float:
        idx = int(round(p * (n - 1)))
        return sorted_vals[min(max(idx, 0), n - 1)]

    return {
        'mean': round(mean_val, 2),
        'p50': round(get_pct(0.50), 2),
        'p95': round(get_pct(0.95), 2),
        'p99': round(get_pct(0.99), 2)
    }

class GlobalMetricsRegistry:

    def __init__(self) -> None:
        self._node_latencies: Dict[str, List[float]] = {}
        self._model_calls: List[ModelCallRecord] = []
        self._e2e_latencies: List[float] = []

    def record_node_latency(self, node_name: str, latency_ms: float) -> None:
        if node_name not in self._node_latencies:
            self._node_latencies[node_name] = []
        self._node_latencies[node_name].append(latency_ms)

    def record_e2e_latency(self, latency_ms: float) -> None:
        self._e2e_latencies.append(latency_ms)

    def record_model_call(self, record: ModelCallRecord) -> None:
        self._model_calls.append(record)

    def get_latency_summary(self) -> Dict[str, Dict[str, float]]:
        summary: Dict[str, Dict[str, float]] = {}
        for node, samples in self._node_latencies.items():
            summary[node] = compute_percentiles(samples)
        if self._e2e_latencies:
            summary['total_e2e'] = compute_percentiles(self._e2e_latencies)
        return summary

    def get_model_accounting_summary(self) -> Dict[str, Any]:
        by_op: Dict[str, Dict[str, Any]] = {}
        total_requests = 0
        total_cost = 0.0
        total_failures = 0
        total_retries = 0

        for mc in self._model_calls:
            key = f"{mc.provider}:{mc.model}:{mc.operation}"
            if key not in by_op:
                by_op[key] = {
                    'provider': mc.provider,
                    'model': mc.model,
                    'operation': mc.operation,
                    'calls': 0,
                    'failures': 0,
                    'retries': 0,
                    'estimated_cost_usd': 0.0
                }
            by_op[key]['calls'] += mc.request_count
            by_op[key]['failures'] += mc.failures
            by_op[key]['retries'] += mc.retries
            by_op[key]['estimated_cost_usd'] = round(by_op[key]['estimated_cost_usd'] + mc.estimated_cost_usd, 6)

            total_requests += mc.request_count
            total_cost += mc.estimated_cost_usd
            total_failures += mc.failures
            total_retries += mc.retries

        return {
            'total_model_calls': total_requests,
            'total_estimated_cost_usd': round(total_cost, 6),
            'total_failures': total_failures,
            'total_retries': total_retries,
            'operations': by_op
        }

    def reset(self) -> None:
        self._node_latencies.clear()
        self._model_calls.clear()
        self._e2e_latencies.clear()

_GLOBAL_METRICS = GlobalMetricsRegistry()

def get_global_metrics() -> GlobalMetricsRegistry:
    return _GLOBAL_METRICS

class ExecutionTracer:

    def __init__(
        self,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        question_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None
    ) -> None:
        self.trace_id: str = trace_id or str(uuid.uuid4())
        self.request_id: str = request_id or str(uuid.uuid4())
        self.question_id: Optional[str] = question_id
        self.document_ids: List[str] = [str(d) for d in (document_ids or [])]
        self.spans: List[TraceSpan] = []
        self.node_latencies: Dict[str, float] = {}
        self.model_calls: List[ModelCallRecord] = []
        self.token_usage: Dict[str, Any] = {'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0}
        self.start_time: float = time.perf_counter()

    def start_span(self, name: str, metadata: Optional[Dict[str, Any]] = None) -> TraceSpan:
        span = TraceSpan(name=name, start_time=time.perf_counter(), metadata=metadata or {})
        self.spans.append(span)
        return span

    def record_node_latency(self, node_name: str, duration_ms: float) -> None:
        self.node_latencies[node_name] = round(duration_ms, 2)
        _GLOBAL_METRICS.record_node_latency(node_name, duration_ms)

    def record_model_call(self, record: ModelCallRecord) -> None:
        self.model_calls.append(record)
        _GLOBAL_METRICS.record_model_call(record)

    def add_token_usage(self, prompt: Union[int, str] = 0, completion: Union[int, str] = 0) -> None:
        if isinstance(prompt, int) and isinstance(completion, int):
            self.token_usage['prompt_tokens'] = int(self.token_usage.get('prompt_tokens', 0)) + prompt
            self.token_usage['completion_tokens'] = int(self.token_usage.get('completion_tokens', 0)) + completion
            self.token_usage['total_tokens'] = int(self.token_usage.get('total_tokens', 0)) + prompt + completion
        else:
            self.token_usage['prompt_tokens'] = 'unavailable'
            self.token_usage['completion_tokens'] = 'unavailable'
            self.token_usage['total_tokens'] = 'unavailable'

    def get_total_latency_ms(self) -> float:
        total = round((time.perf_counter() - self.start_time) * 1000, 2)
        _GLOBAL_METRICS.record_e2e_latency(total)
        return total

    def get_latency_breakdown(self) -> Dict[str, float]:
        breakdown: Dict[str, float] = dict(self.node_latencies)
        for span in self.spans:
            if span.name not in breakdown:
                breakdown[span.name] = span.duration_ms
        return breakdown

    def to_dict(self) -> Dict[str, Any]:
        return {
            'trace_id': self.trace_id,
            'request_id': self.request_id,
            'question_id': self.question_id,
            'document_ids': self.document_ids,
            'total_latency_ms': self.get_total_latency_ms(),
            'latency_breakdown': self.get_latency_breakdown(),
            'token_usage': self.token_usage,
            'model_calls': [mc.model_dump() for mc in self.model_calls],
            'spans': [span.model_dump() for span in self.spans]
        }
