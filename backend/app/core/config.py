import os
from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_ENV: str = "development"
    PROJECT_NAME: str = "OKF Knowledge Assistant"
    VERSION: str = "1.0.0"

    # LLM Settings
    LLM_PROVIDER: Literal["groq", "ollama", "mock"] = "mock"
    LLM_MODEL_NAME: str = "Llama 3.2"
    
    # Groq Settings (Default: Llama 3.2 3B preview)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.2-3b-preview"
    
    # Ollama Settings (Default: Llama 3.2)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    # Storage & Paths
    KNOWLEDGE_DIR: str = str(PROJECT_ROOT / "knowledge")
    DATABASE_URL: str = str(PROJECT_ROOT / "data" / "okf_chat.db")
    
    # Advanced Hybrid RAG Retrieval Tuning
    BM25_K1: float = 1.5
    BM25_B: float = 0.75
    RRF_K: int = 60
    HYBRID_ALPHA: float = 0.5  # Balance between BM25 and Semantic Cosine
    MAX_RETRIEVAL_PASSAGES: int = 5
    MIN_RELEVANCE_SCORE: float = 0.5
    MAX_CONTEXT_TOKENS: int = 3500
    ENABLE_QUERY_EXPANSION: bool = True
    ENABLE_CONTEXT_EXPANSION: bool = True

settings = Settings()
