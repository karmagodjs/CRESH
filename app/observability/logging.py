import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

_SENSITIVE_KEY_PATTERN = re.compile(r'(?i)(api[_-]?key|secret|token|password|auth|credential|bearer)')
_SECRET_VALUE_PATTERN = re.compile(r'(?i)(bearer\s+[a-zA-Z0-9_\-\.]{10,}|co_[a-zA-Z0-9]{20,}|sk-[a-zA-Z0-9]{20,})')

def redact_secrets(data: Any) -> Any:

    if isinstance(data, str):
        return _SECRET_VALUE_PATTERN.sub('[REDACTED_SECRET]', data)
    elif isinstance(data, dict):
        cleaned: Dict[str, Any] = {}
        for k, v in data.items():
            if _SENSITIVE_KEY_PATTERN.search(str(k)):
                cleaned[k] = '[REDACTED]'
            else:
                cleaned[k] = redact_secrets(v)
        return cleaned
    elif isinstance(data, (list, tuple, set)):
        return [redact_secrets(item) for item in data]
    return data

class JSONFormatter(logging.Formatter):
\
\
\
\
\
\
\
\
\
\
\
\
\

    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }

        if hasattr(record, 'event') and record.event:
            log_data['event'] = str(record.event)
        elif hasattr(record, 'node') and record.node:
            log_data['event'] = f"{record.node}_event"

        if hasattr(record, 'request_id') and record.request_id:
            log_data['request_id'] = str(record.request_id)
        if hasattr(record, 'trace_id') and record.trace_id:
            log_data['trace_id'] = str(record.trace_id)
        if hasattr(record, 'question_id') and record.question_id:
            log_data['question_id'] = str(record.question_id)

        if hasattr(record, 'document_ids') and record.document_ids is not None:
            log_data['document_ids'] = list(record.document_ids)
        elif hasattr(record, 'document_id') and record.document_id:
            log_data['document_ids'] = [str(record.document_id)]

        if hasattr(record, 'latency_ms') and record.latency_ms is not None:
            try:
                log_data['latency_ms'] = round(float(record.latency_ms), 2)
            except (ValueError, TypeError):
                log_data['latency_ms'] = record.latency_ms

        if hasattr(record, 'status') and record.status:
            log_data['status'] = str(record.status)

        if hasattr(record, 'metadata') and isinstance(record.metadata, dict):
            for k, v in record.metadata.items():
                if k not in log_data:
                    log_data[k] = v

        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        clean_log_data = redact_secrets(log_data)
        return json.dumps(clean_log_data)

def log_event(
    logger: logging.Logger,
    event: str,
    level: str = 'INFO',
    request_id: Optional[str] = None,
    trace_id: Optional[str] = None,
    document_ids: Optional[Union[List[str], str]] = None,
    latency_ms: Optional[float] = None,
    status: str = 'success',
    msg: Optional[str] = None,
    **kwargs: Any
) -> None:

    if isinstance(document_ids, str):
        document_ids = [document_ids]

    extra: Dict[str, Any] = {
        'event': event,
        'request_id': request_id,
        'trace_id': trace_id,
        'document_ids': document_ids,
        'latency_ms': latency_ms,
        'status': status,
        'metadata': kwargs
    }

    log_level_int = getattr(logging, level.upper(), logging.INFO)
    message_text = msg or f"Event '{event}' status: {status}"
    logger.log(log_level_int, message_text, extra=extra)

def setup_logging(log_level: str = 'INFO', json_format: bool = False) -> None:
    root_logger = logging.getLogger('cri')
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    handler = logging.StreamHandler(sys.stdout)
    if json_format:
        handler.setFormatter(JSONFormatter())
    else:
        standard_formatter = logging.Formatter(
            fmt='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(standard_formatter)
    root_logger.addHandler(handler)
    root_logger.propagate = False

def get_logger(name: Optional[str] = None) -> logging.Logger:
    if name:
        return logging.getLogger(f'cri.{name}')
    return logging.getLogger('cri')
