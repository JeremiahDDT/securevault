"""
SecureVault Security Microservice
==================================
FastAPI microservice responsible for:
- AES-256-GCM encryption/decryption of vault entries
- HaveIBeenPwned breach checking (k-anonymity model)
- Security audit report generation

This service is internal-only — it should NOT be exposed to the public internet.
"""
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import encrypt, breach, audit
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SecureVault Security Service starting up")
    yield
    logger.info("SecureVault Security Service shutting down")


app = FastAPI(
    title="SecureVault Security Service",
    description="Internal microservice for encryption and breach detection",
    version="1.0.0",
    lifespan=lifespan,
    # Disable docs in production
    docs_url="/docs" if True else None,
)

# CORS — only allow the Node.js backend, not the public
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # Only our backend
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

app.include_router(encrypt.router, tags=["Encryption"])
app.include_router(breach.router, tags=["Breach Detection"])
app.include_router(audit.router, tags=["Audit"])


@app.get("/health")
async def health():
    return {"status": "ok"}
