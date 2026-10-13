from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.services.knowledge_loader import knowledge_loader
from backend.app.services.retrieval import retrieval_engine
from backend.app.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Scan knowledge bundle and initialize retrieval index
    logger.info("Initializing OKF knowledge base...")
    docs_count, chunks_count, findings = knowledge_loader.scan_and_load()
    retrieval_engine.index_chunks(knowledge_loader.chunks)
    logger.info(f"Loaded {docs_count} OKF concepts ({chunks_count} chunks). Validation findings: {len(findings)}")
    yield
    logger.info("Shutting down OKF Assistant service.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Knowledge Assistant powered by Open Knowledge Format (OKF v0.2)",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global safe exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please check server logs for details."}
    )

# Include API routes
app.include_router(router)
