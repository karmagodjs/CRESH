from functools import lru_cache
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')
    APP_NAME: str = 'Cohere Research Intelligence'
    APP_VERSION: str = '1.0.0'
    DEBUG: bool = False
    COHERE_API_KEY: Optional[str] = Field(default=None)
    COHERE_EMBED_MODEL: str = Field(default='embed-english-v3.0')
    COHERE_RERANK_MODEL: str = Field(default='rerank-v3.5')
    COHERE_GENERATE_MODEL: str = Field(default='command-r-plus-08-2024')
    QDRANT_LOCATION: str = Field(default=':memory:')
    QDRANT_COLLECTION_NAME: str = Field(default='research_papers')
    QDRANT_API_KEY: Optional[str] = Field(default=None)
    EMBEDDING_DIMENSION: int = Field(default=1024)
    CHUNK_SIZE: int = Field(default=512)
    CHUNK_OVERLAP: int = Field(default=64)
    MAX_UPLOAD_SIZE_MB: int = Field(default=50)
    DENSE_TOP_K: int = Field(default=30)
    BM25_TOP_K: int = Field(default=30)
    RETRIEVAL_TOP_K: int = Field(default=30)
    RERANK_TOP_K: int = Field(default=10)
    EVIDENCE_TOP_K: int = Field(default=5)
    ENABLE_MULTI_QUERY: bool = Field(default=True)
    SIMILARITY_THRESHOLD: float = Field(default=0.25)
    ENABLE_HYBRID_SEARCH: bool = Field(default=True)
    BM25_WEIGHT: float = Field(default=0.3)
    DENSE_WEIGHT: float = Field(default=0.7)
    MAX_RETRIEVAL_ATTEMPTS: int = Field(default=3)
    ENABLE_QUERY_DECOMPOSITION: bool = Field(default=True)
    CONFIDENCE_THRESHOLD: float = Field(default=0.7)
    MAX_REGENERATION_ATTEMPTS: int = Field(default=2)
    ENABLE_HARDENED_ABSTENTION: bool = Field(default=False)
    ENABLE_ANSWER_TARGETING: bool = Field(default=False)
    HOST: str = Field(default='0.0.0.0')
    PORT: int = Field(default=8000)
    LOG_LEVEL: str = Field(default='INFO')
    CORS_ORIGINS: str = Field(default='*')

    def validate_configuration(self) -> None:

        errors = []
        if not self.QDRANT_LOCATION:
            errors.append("QDRANT_LOCATION must not be empty.")
        if not self.COHERE_EMBED_MODEL:
            errors.append("COHERE_EMBED_MODEL must not be empty.")
        if not self.COHERE_RERANK_MODEL:
            errors.append("COHERE_RERANK_MODEL must not be empty.")
        if not self.COHERE_GENERATE_MODEL:
            errors.append("COHERE_GENERATE_MODEL must not be empty.")
        if self.CHUNK_SIZE <= 0:
            errors.append("CHUNK_SIZE must be greater than 0.")
        if self.CHUNK_OVERLAP < 0:
            errors.append("CHUNK_OVERLAP must be non-negative.")
        if self.CHUNK_OVERLAP >= self.CHUNK_SIZE:
            errors.append(f"CHUNK_OVERLAP ({self.CHUNK_OVERLAP}) must be strictly less than CHUNK_SIZE ({self.CHUNK_SIZE}).")
        if self.MAX_UPLOAD_SIZE_MB <= 0:
            errors.append("MAX_UPLOAD_SIZE_MB must be greater than 0.")
        if self.DENSE_TOP_K <= 0 or self.BM25_TOP_K <= 0 or self.RERANK_TOP_K <= 0:
            errors.append("Retrieval top_k settings must be greater than 0.")
        if errors:
            raise ValueError(f"Configuration validation failed: {'; '.join(errors)}")

    def get_safe_dict(self) -> dict:

        data = self.model_dump()
        if data.get('COHERE_API_KEY'):
            data['COHERE_API_KEY'] = '[REDACTED_SECRET]'
        if data.get('QDRANT_API_KEY'):
            data['QDRANT_API_KEY'] = '[REDACTED_SECRET]'
        return data

@lru_cache()
def get_settings() -> Settings:
    return Settings()
