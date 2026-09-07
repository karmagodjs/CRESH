# CRI Research

**CRI Research** is a document-grounded research assistant for asking questions about scientific papers and getting evidence-backed answers with citations.

## Features

- PDF/document ingestion with isolated retrieval
- Hybrid Dense + BM25 search
- Cohere Rerank for evidence selection
- Citation-grounded answers
- Evidence and grounding verification
- Research-focused Next.js interface
- Responsive desktop and mobile UI

## Stack

**Frontend:** Next.js, React, TypeScript  
**Backend:** FastAPI, Python, LangGraph  
**AI:** Cohere Embed, Rerank, Command  
**Retrieval:** Qdrant + BM25 + RRF

## Run Locally

```bash
# Backend
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Use `.env.example` to configure the required environment variables.

## Purpose

CRI Research combines retrieval, reranking, evidence verification, and citation-grounded generation into one research workspace.
