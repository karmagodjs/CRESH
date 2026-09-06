from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes_documents import router as documents_router
from app.api.routes_query import get_system_metrics, router as query_router
from app.api.schemas import HealthResponse, MetricsResponse, ReadinessResponse
from app.config import get_settings
from app.models.cohere_client import get_cohere_client
from app.observability.logging import get_logger, setup_logging
from app.retrieval.vector_store import get_vector_store

settings = get_settings()
setup_logging(log_level=settings.LOG_LEVEL)
logger = get_logger('main')

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f'Starting {settings.APP_NAME} v{settings.APP_VERSION}')
    settings.validate_configuration()
    get_cohere_client()
    get_vector_store()
    try:
        from pathlib import Path
        from app.api.routes_documents import ingest_document_safely, _DOCUMENT_REGISTRY
        bert_path = Path('data/sample_papers/1810.04805v2.pdf')
        if bert_path.exists() and not any('1810.04805' in d.filename for d in _DOCUMENT_REGISTRY.values()):
            with open(bert_path, 'rb') as fp:
                ingest_document_safely(file_bytes=fp.read(), filename=bert_path.name)
            logger.info('Preloaded BERT paper into document registry for demo mode.')
    except Exception as e:
        logger.warning(f'Could not preload sample BERT document: {e}')
    yield
    logger.info('Shutting down CRI application server.')

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description='Research-grade AI assistant powered by Cohere and LangGraph',
    lifespan=lifespan
)
cors_setting = settings.CORS_ORIGINS.strip()
cors_origins = ['*'] if cors_setting == '*' else [o.strip() for o in cors_setting.split(',') if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=cors_origins, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
app.include_router(documents_router)
app.include_router(query_router)

@app.get('/health', response_model=HealthResponse, tags=['Observability'])
def health_check() -> HealthResponse:
    cohere_client = get_cohere_client()
    vector_store = get_vector_store()
    vs_health = vector_store.health_check()
    return HealthResponse(
        status='healthy',
        version=settings.APP_VERSION,
        cohere_live=cohere_client.is_live,
        vector_store_health=vs_health,
        total_indexed_chunks=vector_store.count()
    )

@app.get('/ready', response_model=ReadinessResponse, tags=['Observability'])
def readiness_check() -> ReadinessResponse:
    try:
        settings.validate_configuration()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Configuration not ready: {str(e)}"
        )

    vector_store = get_vector_store()
    vs_health = vector_store.health_check()
    if vs_health.get('status') not in ('healthy', 'ready', 'memory', 'connected'):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vector store not responsive"
        )

    cohere_client = get_cohere_client()

    return ReadinessResponse(
        status='ready',
        version=settings.APP_VERSION,
        dependencies={
            'configuration': 'valid',
            'vector_store': vs_health.get('status', 'ready'),
            'cohere_mode': 'live' if cohere_client.is_live else 'simulator'
        },
        total_indexed_chunks=vector_store.count()
    )

@app.get('/metrics', response_model=MetricsResponse, tags=['Observability'])
def metrics() -> MetricsResponse:
    return MetricsResponse(**get_system_metrics())

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app.main:app', host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
