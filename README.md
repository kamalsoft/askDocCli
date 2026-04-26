
# Ask‑Docs  
Local, Offline, Open‑Source Documentation Intelligence Engine

Ask‑Docs is a fully local, offline, open‑source documentation intelligence system.  
It ingests Markdown files, chunks them intelligently, embeds them using local models, and answers questions using a hybrid RAG + LLM pipeline.

Everything runs 100% locally — no cloud, no SaaS, no telemetry.


## Features

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


## Project Structure
```
ask-docs/
  cli.js
  ask.js
  ingest.js
  synthesizer.js
  cache.js
  config.js
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
- 1200–1500 characters per chunk
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

```
GET /api/docs/list
GET /api/docs/get?name=<file>
POST /ask
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

## No chunks found  
Check `docsPath`.

## Always returns architecture.md  
Docs contained duplicate content — fixed now.

## Slow ingest  
Enable caching or reduce chunk size.


## Roadmap

- Hybrid search (keyword + vector)
- Multi-hop reasoning
- Query rewriting
- Model auto‑selection
- Plugin system

## License

MIT License — fully open‑source and free to use.

