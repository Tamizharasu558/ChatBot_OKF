# OKF-Powered Knowledge Chatbot with Meta Llama 3.2 & Hybrid RAG

A modern, full-stack enterprise knowledge assistant powered by the official **Open Knowledge Format (OKF v0.2)** specification. The system features a state-of-the-art **Hybrid RAG (Retrieval-Augmented Generation) System**, native **Meta Llama 3.2** instruction-tuned chatbot models, a dedicated **Document Intelligent Library**, automated document extraction, an **AI Acknowledgement Intelligence Workspace**, verified source citations, and an Apple-inspired minimalist user interface.

---

## 1. Architectural Highlights

- **Strict OKF v0.2 Conformance**: Parses and validates knowledge bundles stored as Markdown files with YAML frontmatter. Supports required `type`, recommended fields (`title`, `description`, `resource`, `tags`), and provenance/trust families (`sources`, `generated`, `verified`, `status`, `stale_after`).
- **🦙 Meta Llama 3.2 Chatbot Engine**:
  - Official Meta Llama 3.2 chat templating (`<|begin_of_text|><|start_header_id|>...`).
  - **Llama 3.2 on Groq Cloud**: Ultra-fast (~550 tok/s) using `llama-3.2-3b-preview`, `llama-3.2-1b-preview`, and `llama-3.2-11b-vision-preview`.
  - **Llama 3.2 on Ollama Local**: Private on-device inference with `llama3.2`, `llama3.2:1b`, and `llama3.2:3b`.
  - **Llama 3.2 Offline High-Precision Engine**: Zero-setup deterministic instruction-following engine that guarantees 100% grounded answers, multi-passage synthesis, and zero hallucination.
  - **Dynamic Model Switcher**: Change providers, update API keys, or switch model variants on the fly via the UI modal or `/api/model/switch` without restarting servers.
- **🔍 Best Accurate Hybrid RAG System**:
  - **BM25 Lexical Channel**: Exact token matching with field boosting for Titles (3.0x), Tags (2.5x), Section Headings (2.0x), and Trust Tiers (1.15x).
  - **Dense Semantic Cosine Vector Channel**: Term-frequency inverse-document frequency vectors with subword character n-gram hashing and unit-length cosine similarity.
  - **Reciprocal Rank Fusion (RRF)**: Combines rankings from both lexical and semantic channels with standard constant $k=60$.
  - **Domain Synonym Expansion**: Enriches queries with domain variants (e.g. *"money-back / cancellation"* $\rightarrow$ *"refund"*, *"throttle / req/min"* $\rightarrow$ *"rate limit, 429"*).
  - **Cross-Passage Reranker & Strict Grounding Gate**: Re-scores candidates using query token coverage, phrase alignment, and trust tier multipliers; cleanly admits gaps on unsupported queries without fabricating citations.
- **📚 Document Intelligent Library**:
  - **Live Catalog Analytics**: Track catalog size, indexed chunks, active provenance sources, average Flesch reading ease, and total word count.
  - **Batch Ingest Dropzone**: Multi-file batch upload (`.pdf`, `.docx`, `.md`, `.txt`, `.csv`, `.json`, etc.) with automatic OKF transformation and immediate indexing.
  - **Interactive Drawer**: Deep inspection of any document with AI executive summaries, readability score & complexity grading, extracted key entities, section outline trees, and raw OKF v0.2 previews.
  - **Direct RAG Launch**: "Chat with this Document" action directly begins grounded conversations.
- **🧠 Enhanced Document Extraction & Semantic Sectioning**:
  - Intelligently detects headings, sections, and boundaries (`## Section`) rather than dumping text into monolithic blocks.
  - Generates comprehensive executive summaries based on the document's actual contents.
  - Dynamically synthesizes 3 probing questions grounded in the extracted document.
- **🛡️ AI Acknowledgement Intelligence Workspace**:
  - **Trust & Acknowledgement Ledger**: Track OKF trust tiers (`human-reviewed`, `machine-confirmed`, `unverified`) and lifecycle statuses.
  - **Interactive Concept Verification**: Direct human-in-the-loop sign-off updating concept YAML frontmatter and appending audit logs to `knowledge/log.md` per OKF §9.
  - **Knowledge Network Cross-Links**: Automatic extraction of directional cross-references between concepts per OKF §6.
  - **Attested Computations Inspector**: Deterministic computation contracts (§10), GAAP ASC 606 SQL review, parameters, and attester code.
  - **AI Deep-Dive Analyzer**: Structural metrics (word counts, sections, code blocks, tables, footnotes) and executive summaries.
- **Honest Knowledge Gap Handling**: Automatically admits when information is unavailable by responding:
  > *"I couldn't find enough information in the available knowledge base to answer that question accurately."*
  with **zero false or fabricated citations**.
- **Apple-Inspired Professional UI**: Built with React, TypeScript, Vite, and Tailwind CSS. Features frosted glassmorphism, responsive navigation, expandable source drawers, attachment upload button, drag-and-drop, and an interactive Knowledge Catalog Explorer.

---

## 2. Directory Structure

```text
ChatBot_OKF/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application & lifecycle indexer
│   │   ├── core/
│   │   │   └── config.py               # Application settings & environment config
│   │   ├── models/
│   │   │   └── okf_models.py           # Pydantic models for OKF v0.2, Library & Chat
│   │   ├── services/
│   │   │   ├── okf_parser.py           # Strict OKF parser & validator
│   │   │   ├── knowledge_loader.py     # Bundle scanner & chunker
│   │   │   ├── retrieval.py            # Hybrid RAG engine (BM25 + Dense Cosine + RRF)
│   │   │   ├── file_extractor.py       # Multi-format document extractor & semantic sectioner
│   │   │   ├── document_library_service.py # Library catalog, readability scoring & outline extractor
│   │   │   ├── intelligence_service.py # Health score, graph cross-links & verification ledger
│   │   │   ├── llm_service.py          # Llama 3.2 providers (Groq, Ollama, Offline Engine)
│   │   │   └── chat_service.py         # End-to-end RAG orchestrator
│   │   ├── db/
│   │   │   └── database.py             # SQLite persistence for chat sessions
│   │   └── api/
│   │       └── routes.py               # REST endpoints (/api/chat, /upload, /library, /model/*)
│   ├── tests/                          # Automated pytest suite (32 tests across 9 test files)
│   └── requirements.txt                # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/                 # ModelSettingsModal, DocumentLibrary, Sidebar, etc.
│   │   ├── services/api.ts             # Frontend API client
│   │   ├── types/index.ts              # TypeScript interfaces
│   │   ├── App.tsx                     # Main application component
│   │   └── index.css                   # Apple styling & scrollbars
│   ├── package.json
│   └── vite.config.ts                  # Vite proxy configuration
├── knowledge/                          # OKF v0.2 Knowledge Bundle
│   ├── index.md                        # Root progressive disclosure index
│   ├── log.md                          # Bundle update history log
│   ├── technical/                      # API endpoints & attested computations
│   ├── products/                       # Order processing & e-commerce playbooks
│   ├── faq/                            # Billing and subscription policies
│   └── general/                        # Data governance & retention schedules
├── data/                               # SQLite database storage (okf_chat.db)
├── .env.example                        # Environment variable template
├── design.md                           # Comprehensive design document
└── README.md                           # Setup, usage, and testing guide
```

---

## 3. Installation & Local Development (macOS)

### Prerequisites
- Python 3.10+ (Python 3.13 tested)
- Node.js 18+ and npm (Node v26 tested)

### Step 1: Clone and Set Up Environment Variables
```bash
cp .env.example .env
```

### Step 2: Backend Setup
```bash
# Create and activate Python virtual environment
python3 -m venv ./venv
source ./venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### Step 3: Frontend Setup
```bash
cd frontend
npm install
cd ..
```

---

## 4. Running the Development Servers

You can run the backend and frontend in separate terminal windows:

### Terminal 1: Start Backend API (Port 8000)
```bash
source ./venv/bin/activate
PYTHONPATH=. uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The API is available at `http://127.0.0.1:8000` (OpenAPI docs at `http://127.0.0.1:8000/docs`).

### Terminal 2: Start Frontend (Port 5173)
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 5. Configuring LLM Providers & Meta Llama 3.2

You can switch providers and models directly in the UI by clicking the **🦙 Llama 3.2** button in the top navigation bar, or by editing `.env`:

### Option A: Offline Llama 3.2 Engine (Default)
No API keys or internet connection required. Answers are generated deterministically and grounded in the indexed OKF documents with multi-passage synthesis and Meta Llama 3.2 instruction-following.
```env
LLM_PROVIDER=mock
```

### Option B: Llama 3.2 via Groq Cloud (API)
Provides ultra-fast Llama 3.2 models (~550 tok/s) via Groq Cloud.
```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
GROQ_MODEL=llama-3.2-3b-preview
```

### Option C: Llama 3.2 via Ollama (Local)
Runs Meta Llama 3.2 locally on your GPU/CPU without sending data to external services.
```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```
Make sure Ollama is running:
```bash
ollama serve
ollama pull llama3.2
```

---

## 6. Running Automated Tests

Run the full automated test suite (32 unit & integration tests):
```bash
PYTHONPATH=. ./venv/bin/pytest backend/tests -v
```

Test coverage includes:
- **Llama 3.2 Integration**: Official Meta Llama 3.2 prompt template token formatting, `/api/model/status`, `/api/model/switch`.
- **Hybrid RAG Retrieval**: BM25 + dense cosine vector fusion, synonym expansion, zero-hallucination thresholding.
- **Document Library**: Catalog generation, readability calculations, intelligence drawer reporting, batch ingestion, and deletion flows.
- **OKF Parser**: Frontmatter extraction, mandatory `type` validation, malformed YAML handling, trust tier derivation (`human-reviewed`, `machine-confirmed`, `unverified`), reserved file recognition.
- **Knowledge Loader**: Recursive bundle scanning, chunking, change detection.
- **Grounded Chat & Attribution**: Grounded response generation, verified citation metadata, and exact knowledge-gap fallback.
- **FastAPI Endpoints**: `/health`, `/api/chat`, `/api/library`, `/api/model/*`, `/api/intelligence/*`.

---

## 7. Manual Verification Scenarios

Try asking these questions in the chat interface:

| Question | Expected Answer & Grounding | Cited Document |
|---|---|---|
| **"What are the API rate limits?"** | 100 req/min (free), 500 req/min (business), 1,000 req/min (enterprise); HTTP 429 Retry-After. | `technical/api_architecture.md` |
| **"What are the stages in the order processing pipeline?"** | 4 stages (Ingestion, Fraud Screening, Inventory Reservation, Fulfillment Dispatch) with risk score rules. | `products/order_processing.md` |
| **"What is the refund policy?"** | 14-day no-questions-asked money-back guarantee, 100% refund in 3–5 business days. | `faq/billing_and_subscriptions.md` |
| **"How is recognized revenue computed?"** | GAAP ASC 606 compliant SQL summing paid invoices without refunds for fiscal year. | `technical/attested_revenue_metric.md` |
| **"What are the log retention schedules?"** | Application access logs retained for 90 days, customer backups for 30 days. | `general/data_governance.md` |
| **"Who was the Roman Emperor in 117 AD?"** (Out of domain) | *"I couldn't find enough information in the available knowledge base to answer that question accurately."* | **No sources cited** |

---

## 8. Security & Safeguards

- **Path Traversal Protection**: File paths are strictly validated using `resolve()` and checked against `KNOWLEDGE_DIR`.
- **Untrusted Code Execution**: SQL and code blocks in `# Computation` are indexed strictly as text and never executed.
- **Prompt Injection Defense**: Context passages are segregated with explicit system demarcations; instructions inside knowledge files cannot alter system rules.
- **Sanitized Secrets**: Environment variables, Groq keys, and database connection strings are never exposed through public API responses or client logs.
