# OKF-Powered Knowledge Chatbot - System Architecture & Design

## 1. Overview & Objectives

The **OKF-Powered Knowledge Chatbot** is an enterprise-grade retrieval-augmented generation (RAG) system built strictly on the **Open Knowledge Format (OKF v0.2)** specification. It allows organizations to curate, validate, index, and query human- and agent-readable markdown knowledge bundles with full provenance, trust tiers, lifecycle tracking, and source citations.

Key goals:
- **Strict OKF Conformance**: Parse and validate concepts according to the official OKF v0.2 specification without inventing proprietary frontmatter schemes.
- **Accurate Grounding & Source Attribution**: Answer user questions strictly using retrieved knowledge passages, returning genuine document and section citations.
- **Honest Admission of Knowledge Gaps**: If the knowledge base lacks sufficient information to answer a question, the assistant explicitly states: *"I couldn't find enough information in the available knowledge base to answer that question accurately."*
- **Provider Agnostic**: Seamlessly support Groq API, local Ollama, and a deterministic fallback/offline mode for testing and air-gapped environments.
- **Apple-Inspired Professional UI**: Minimalist, clean, distraction-free aesthetic with refined typography, frosted glass accents, dark/light themes, and responsive layout.

---

## 2. Architecture Diagram

```
+-------------------------------------------------------------------------+
|                              REACT FRONTEND                             |
|  (Vite + TypeScript + Tailwind CSS + Lucide Icons + Apple Minimal UI)   |
+-------------------+--------------------------------+--------------------+
                    |                                |
       Chat / Stream API                  Knowledge Explorer / Reindex
                    v                                v
+-------------------------------------------------------------------------+
|                           FASTAPI BACKEND                               |
|  (/health, /api/chat, /api/knowledge, /api/knowledge/reindex, etc.)     |
+---------+-------------------+----------------------+--------------------+
          |                   |                      |
          v                   v                      v
+-------------------+ +-------------------+ +---------------------------+
|  KNOWLEDGE LOADER | | RETRIEVAL ENGINE  | |      LLM SERVICE          |
|  - Recursive scan | | - BM25 / Scoring  | | - Groq API (Cloud)        |
|  - Change detect  | | - Field boosting  | | - Ollama (Local)          |
|  - Chunker        | | - Context budget  | | - Mock/Offline (Testing)  |
|  - Footnote joins | | - Source mapping  | | - Grounded System Prompt  |
+---------+---------+ +---------+---------+ +-------------+-------------+
          |                     |                         |
          v                     |                         v
+-------------------+           |           +---------------------------+
|    OKF PARSER     |           +---------->|      CHAT SERVICE         |
|  - YAML Frontmat. |                       | - Multi-turn conversation |
|  - Validation     |                       | - SQLite Persistence      |
|  - Trust tiers    |                       | - Attribution assembly    |
|  - Reserved files |                       +-------------+-------------+
+---------+---------+                                     |
          |                                               v
          v                                 +---------------------------+
+-------------------+                       |    SQLITE DATABASE        |
| KNOWLEDGE BUNDLE  |                       |  (conversations, msgs,    |
| (knowledge/*.md)  |                       |   document metadata)      |
+-------------------+                       +---------------------------+
```

---

## 3. OKF Specification Alignment (v0.2)

The system adheres strictly to the official specification:
1. **Bundle Structure**: A directory hierarchy containing `.md` concept files, optional `index.md` (progressive disclosure directory listings), and optional `log.md` (update changelog).
2. **Concept Documents**:
   - YAML frontmatter delimited by `---` lines.
   - **Required field**: `type` (e.g., `API Endpoint`, `Playbook`, `Metric`, `Guide`, `FAQ`, `Attested Computation`).
   - **Recommended fields**: `title`, `description`, `resource`, `tags`.
   - **Provenance & Trust fields**:
     - `sources`: Array of `{ resource, id?, title?, author?, usage_count?, last_modified? }`.
     - `generated`: `{ by, at }`.
     - `verified`: Array or bare mapping of `{ by, at }`. Derives Trust Tier: `unverified`, `machine-confirmed`, or `human-reviewed`.
     - `status`: `draft` | `stable` | `deprecated`.
     - `stale_after`: ISO 8601 timestamp.
   - **Markdown Body**: Headings (`# Overview`, `# Schema`, `# Computation`), text, lists, and per-claim footnotes (`[^source-id]`).
3. **Attested Computations (§10)**: Supported with `runtime`, `parameters`, `executor`, `attester`, and `# Computation` blocks.
4. **Reserved Filenames**: `index.md` and `log.md` are treated as bundle navigation and changelog files, not concepts.

---

## 4. Retrieval & Grounding Workflow

```
User Query
    │
    ▼
[Input Validation & Sanitization]
    │
    ▼
[Knowledge Index Search (BM25 + Field Boosting)]
    ├── Title Matches (Weight: 3.0)
    ├── Tag Matches (Weight: 2.5)
    ├── Section Matches (Weight: 2.0)
    └── Body Matches (Weight: 1.0)
    │
    ▼
[Passage Ranking & Context Budget Selection]
    │
    ├── Score < Relevance Threshold?
    │       ├── YES: Return "I couldn't find enough information..."
    │       └── NO: Assemble Top-K Context Passages
    │
    ▼
[System Prompt Injection]
    ├── Injected Grounded Rules
    ├── Injected Context Passages with Explicit XML/Delimiters
    └── Conversation History (Last N turns)
    │
    ▼
[LLM Generation (Groq / Ollama / Mock)]
    │
    ▼
[Source Attribution & Link Verification]
    │
    ▼
Structured JSON Response to Client
```

---

## 5. Backend API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Application status, active LLM provider, indexed document count |
| `POST` | `/api/chat` | Submit question with optional conversation ID; returns grounded answer & sources |
| `GET` | `/api/conversations` | List conversation sessions |
| `GET` | `/api/conversations/{id}` | Retrieve messages for a session |
| `DELETE` | `/api/conversations/{id}` | Delete a conversation session |
| `GET` | `/api/knowledge` | List indexed concepts, trust tiers, statuses, and validation issues |
| `GET` | `/api/knowledge/documents/{concept_id:path}` | Get full document metadata and body |
| `POST` | `/api/knowledge/documents` | Create or update a concept document with OKF validation |
| `POST` | `/api/knowledge/reindex` | Trigger incremental reindexing and return refreshed stats |

---

## 6. Frontend Design Principles (Apple Aesthetic)

- **Typography**: Clean hierarchy with system font fallbacks (`-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif`).
- **Color Palette**:
  - Light mode: Crisp porcelain background (`#fbfbfd`), subtle border outlines (`#e5e5ea`), pure white cards (`#ffffff`).
  - Dark mode: Deep space gray (`#0b0d10`), dark elevated surfaces (`#16181d`), hairline borders (`rgba(255,255,255,0.08)`).
- **Glassmorphism**: Subtle `backdrop-blur-md` on headers, input containers, and sidebar.
- **Interactions**:
  - Smooth micro-interactions without distracting, flashy animations.
  - Collapsible source drawer below each assistant answer.
  - Interactive Knowledge Explorer modal to browse, view, and inspect OKF concepts.
  - Clear loading skeletons and typing indicators.
  - Keyboard shortcuts: `Enter` to submit, `Shift+Enter` for multiline input.

---

## 7. Security & Resilience Safeguards

1. **Path Traversal Protection**: Enforce that all document paths resolve strictly within the configured `KNOWLEDGE_DIR`.
2. **Code Execution Safeguard**: Content inside `# Computation` or code blocks is treated strictly as static text and is never executed.
3. **Prompt Injection Shielding**: User inputs and document bodies are cleanly demarcated with boundary tags; system instructions explicitly forbid knowledge text from altering system rules.
4. **Environment Isolation**: `.env` is ignored by Git; `.env.example` contains safe mock defaults.
5. **Graceful Fallbacks**: If Groq or Ollama is unavailable, the backend returns clear descriptive error responses rather than 500 stack traces.
