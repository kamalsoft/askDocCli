
# Ask‑Docs  
Local, Offline, Open‑Source Documentation Intelligence Engine

Ask‑Docs is a fully local, offline, open‑source documentation intelligence system.  
It ingests Markdown files, chunks them intelligently, embeds them using local models, and answers questions using a hybrid RAG + LLM pipeline.

Everything runs 100% locally — no cloud, no SaaS, no telemetry.


## Features

- Performance Optimized (ONNX Threading)
- Local RAG engine (no external APIs)
- LLM answer synthesis (local model)
- Confidence fallback mode (prevents hallucinations)
- Documentation Explorer UI
- Chunk visualization mode
- Fast local embeddings (Xenova)
- Benchmarking suite
- Config‑driven architecture
- CLI + Web UI
- RAG‑optimized docs folder
- Offline by design

## ⚙️ System Architecture & Documentation

Ask‑Docs is engineered as a hybrid RAG (Retrieval‑Augmented Generation) system. While ingestion and embedding are strictly local for privacy, the reasoning phase can be toggled between local execution (ONNX) and remote inference via OpenRouter.

### Visual Workflow & Data Processing

```mermaid
graph LR
    %% Visual Styling for better UX
    classDef local fill:#e3f2fd,stroke:#1e88e5,stroke-width:1px,color:#000;
    classDef remote fill:#fff3e0,stroke:#fb8c00,stroke-width:1px,color:#000;
    classDef storage fill:#f3e5f5,stroke:#8e24aa,stroke-width:1px,color:#000;
    classDef decision fill:#fff9c4,stroke:#fbc02d,stroke-width:1px,color:#000;
    classDef start fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px,color:#000;

    subgraph "Phase 1: Local Ingestion (Strictly Private)"
        A[docs/ folder]:::start --> B[File Walker]
        B --> C{Cache?}:::decision
        C -- "Hit" --> D[Skip]
        C -- "Miss" --> E[Chunker]
        E --> F[Jina V2 Embedding]:::local
        F --> G[(Vector Store)]:::storage
    end

    subgraph "Phase 2: Hybrid Query Processor"
        H[User Input]:::start --> I[Query Embedding]:::local
        I --> J[Vector Search]
        J --> K[Context Retrieval]
        K --> L[Build Prompt]
        L --> M{Mode?}:::decision
        M -- "Local" --> N[Llama 3.2 SLM]:::local
        M -- "Remote" --> O[OpenRouter API]:::remote
        M -- "Auto" --> O
        O -- "Fail" --> N
        N --> P[Synthesis]
        O --> P
        P --> Q[Response]:::start
    end
```

### Technical Breakdown

1.  **Data Collection & Chunker**: The engine scans the `docs/` directory using native `fs` logic. It intelligently splits Markdown files into chunks of ~600 characters while preserving the context of the nearest heading.
2.  **Caching Mechanism**: To ensure speed, `cache.json` tracks file hashes. Only modified or new files are sent to the embedding model, significantly reducing re-ingest time.
3.  **Local Embedding**: Chunks are processed by `Xenova/jina-embeddings-v2-base-en` via `@huggingface/transformers`. The `onnxruntime-node` engine executes these models locally on your CPU.
4.  **Vector Store**: The resulting vectors and their corresponding text segments are stored in a local `docs.json` file.
5.  **Similarity Search**: When you ask a question, it is converted into a vector using the same local model. A dot-product calculation finds the most relevant chunks in your documentation.
6.  **Context-Restricted Synthesis**:
    *   **The Prompt**: The system merges the most relevant chunks (default: 2) into a specialized prompt: *"Rewrite the answer using ONLY the information in the context. Do NOT invent details. Write a clear, concise answer in 3–5 sentences."*
    *   **The Model**: In `local` mode, **Llama 3.2 1B** (via `transformers`) handles reasoning. In `openrouter` mode, `fetch` is used to call remote LLMs.
    *   **User Interface**: The Terminal UI is powered by `blessed` for layout and `chalk` for colorized feedback.
7.  **Response**: The system returns a synthesized answer accompanied by exact citations (file name, heading, and line numbers) to ensure transparency and eliminate hallucinations.

## Project Structure
```
ask-docs/
  cli.js
  ask.js
  ingest.js
  synthesizer.js
  cache.js
  config.js
  tui.js
  panel.js
  verify-models.js
  server/
    webServer.js
  vector-store/
docs/
  overview.md
  architecture.md
  authentication.md
  transactions.md
  errors.md
  exceptions.md
  examples.md
  glossary.md
  webhook-events.md
  sidebar.md
  index.md
  diagrams/
    transaction-flow.md
    system-architecture.md
web/
  src/
    components/
      Sidebar.jsx
      DocViewer.jsx
    pages/
      Docs.jsx
      Ask.jsx
    App.jsx
```


## Installation

```bash
git clone https://github.com/<your-repo>/ask-docs
cd ask-docs
npm install

# Build the Web UI
npm run build:web

# Download and verify local models
./download_models.sh
node verify-models.js
```

## CLI Usage

### Ingest documentation

```bash
ask-docs ingest
```

Force rebuild:

```bash
ask-docs ingest --force
```

Debug mode:

```bash
ask-docs ingest --debug
```

## Ask a question

```bash
ask-docs ask "How does authentication work?"
```

Debug:

```bash
ask-docs ask "Explain settlement" --debug
```

---

## Web UI

Start the server:

```bash
npm run web
```

Open:

```URL
http://localhost:5174
```

Includes:

- Chat Q&A
- Docs Explorer
- Searchable Sidebar
- Chunk Visualization Mode
- Dark/Light mode


## RAG Pipeline Overview

1. Ingest  
   - Walk docs folder  
   - Chunk Markdown by headings  
   - Embed chunks  
   - Save vector store  

2. Ask  
   - Embed question  
   - Retrieve top chunks  
   - Score + rank  
   - Confidence check  
   - LLM synthesis  

3. Fallback  
   - Low confidence → LLM‑only answer  



## Chunking Strategy

- Heading‑aware
- ~600 characters per chunk (optimized for 1B-3B parameter models)
- Each chunk includes:
  - file
  - heading
  - startLine / endLine
  - text
  - embedding


## Embedding Model

```
Xenova/jina-embeddings-v2-base-en
```

Runs fully local via ONNX.

## LLM Answer Synthesis

Model:

```MODEL
Xenova/llama-3.2-1b-instruct
```

Pipeline:

- Combine top chunks
- Generate 3–5 sentence answer
- Context‑restricted prompt


## Confidence Fallback Mode

If:

```
topScore < 0.12
```

Then:

- Skip RAG
- Generate LLM‑only answer
- No citations returned


## Document Explorer UI

Includes:

- Sidebar listing all docs
- Click to open any doc
- Search inside docs
- Syntax highlighting
- Mermaid diagram support


## Chunk Visualization Mode

Toggle:

```
[ ] Show chunks
```

Displays:

- Chunk preview
- Score
- File
- Heading
- Line numbers


## Benchmarking Suite

Run:

```bash
ask-docs benchmark
```

Outputs:

- Expected file
- Retrieved file
- Accuracy score


## Config File

`ask-docs.config.json`:

```json
{
  "docsPath": "./docs",
  "storePath": "./ask-docs/vector-store/docs.json",
  "chunkChars": 1200,
  "confidenceThreshold": 0.12,
  "enableLLM": true
}
```


## Vector Store Format

Each entry:

```json
{
  "id": "docs/authentication.md-0",
  "file": "authentication.md",
  "filePath": "./docs/authentication.md",
  "heading": "Overview",
  "startLine": 1,
  "endLine": 32,
  "text": "...",
  "embedding": [ ... ]
}
```

## Cache System

`cache.json` stores:

- file hash
- last modified time
- chunk metadata

Used to skip unchanged files.


## Docs Folder (RAG‑Optimized)

Includes:

- overview.md
- architecture.md
- authentication.md
- transactions.md
- errors.md
- exceptions.md
- examples.md
- glossary.md
- webhook-events.md
- sidebar.md
- index.md
- diagrams/


## Mermaid Diagrams

Located in:

```
docs/diagrams/
```

Includes:

- Transaction flow
- System architecture


## API Endpoints

The system provides a RESTful interface for the Web UI and 3rd-party automation tools.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET`  | `/api/docs/list` | Returns a list of all indexed Markdown files. |
| `GET`  | `/api/docs/get?name=...` | Returns the raw text of a specific document. |
| `GET`  | `/api/docs/search?q=...` | Case-insensitive search of document filenames. |
| `GET`  | `/api/models/summary` | Check health and LFS status of local reasoning models. |
| `GET`  | `/api/config` | Returns the current active inference mode and app settings. |
| `POST` | `/api/config` | Update application settings (e.g., toggle `bm25Only`). |
| `POST` | `/api/models/verify` | Trigger full integrity check of models and API keys. |
| `POST` | `/ask` | **Core RAG Query**: Accepts `{"question": "..."}`. Supports streaming via `Accept: text/event-stream`. |
| `POST` | `/api/ingest` | **Trigger Ingestion**: Forces a re-scan of the `docsPath` and updates the vector store. |

### SSE Streaming Protocol
When requesting streaming via `/ask`, the server emits standard `data: ` JSON payloads:

1.  **Thought Tokens**: `{"type": "thought", "text": "..."}` - Use to show "Thinking" progress.
2.  **Answer Start**: `{"type": "answer_start"}` - Signal to switch from thinking to answering view.
3.  **Answer Tokens**: `{"type": "answer", "text": "..."}` - The actual response body.
4.  **Agentic Status**: `{"type": "status", "text": "..."}` - Used when the agent triggers an additional search loop.
5.  **Final Payload**: `{"done": true, "answer": "...", "citations": [...], "hasMoreContext": true, "tps": 12.5}`

**Example: Triggering Ingestion via Curl**
```bash
curl -X POST http://localhost:5174/api/ingest
```


## Logging

- Colored logs
- Per-file ingest timing
- Chunk-level logs
- Cache hits/misses


# Performance

- Embeddings cached
- LLM loaded once
- Optimized chunking
- Zero network calls


## Security

- Fully offline
- No telemetry
- No cloud dependencies


# Extensibility

Planned modules:

- PDF ingestion
- HTML ingestion
- Confluence connector
- GitHub Wiki ingestion
- Multi‑tenant workspace support


## Troubleshooting

### 🔴 Protobuf parsing failed
This error usually indicates that the ONNX model files are corrupt or incomplete.
1. **Git LFS Pointers**: Check if your `.onnx` files are only a few hundred bytes. If so, they are pointers and not the actual weights.
2. **Missing Split Weights**: Large models like Phi-3.5 require the `.onnx_data` file in the same directory as the `.onnx` file.
3. **Solution**: Re-run `bash download_models.sh` or follow the `manual_model_setup.md` guide.

### 🟡 No chunks found  
Check `docsPath`.

### 🟡 Always returns architecture.md  
Docs contained duplicate content — fixed now.

### 🟡 Slow ingest  
Enable caching or reduce chunk size.

### 🟢 Model Integrity
Run `node verify-models.js` to calculate SHA-256 checksums and verify file sizes.

## Roadmap

- Hybrid search (keyword + vector)
- Multi-hop reasoning
- Query rewriting
- Model auto‑selection
- Plugin system

## License

MIT License — fully open‑source and free to use.
