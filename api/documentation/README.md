# Ask-Docs Documentation

**Ask-Docs** is a local-first Retrieval-Augmented Generation (RAG) application. it is designed to run Large Language Models (LLMs) and embedding models directly on your machine using ONNX and Transformers.js, ensuring your data never leaves your local environment.

## 🚀 Overview

The application allows users to index a folder of Markdown documents and query them using natural language. It optimizes for speed and privacy by utilizing "Small Language Models" (SLMs) that are efficient enough to run on consumer-grade CPUs.

## 📚 Deep Dive Guides

Detailed information on specific areas of the platform:

*   **[Technical Features](./technicalFeatures.md)**: Details on Hybrid Search, Agentic Loops, and Performance.
*   **[Model Configuration](./modelConfiguration.md)**: Setup guides for ONNX and OpenRouter.
*   **[Business Overview](./businessOverview.md)**: ROI, DPIA, and Industry use cases.

## 🏁 Getting Started

Follow these steps to get the environment ready for execution.

### 1. Installation
Clone the repository and install the Node.js dependencies:
```bash
npm install
```

### 2. Model Preparation
The application requires specific ONNX models. You can download them using the provided script:
```bash
./download_models.sh
```

### 3. Verify Integrity
Before running queries, verify that the models were downloaded correctly and are not Git LFS pointers:
```bash
node verify-models.js
```
*Tip: Use `--re-download` with this command to automatically fix detected issues.*

### 4. Data Ingestion
Index your markdown files (found in the directory specified by `docsPath` in `config.js`):
```bash
node cli.js ingest
```

## � Architecture

The project is built on a lean, high-performance Node.js stack:

*   **Orchestration**: `commander` (CLI) and `blessed` (TUI).
*   **Inference**: `@huggingface/transformers` (v3) provides the pipeline abstraction.
*   **Backend Engine**: `onnxruntime-node` performs the actual tensor math for local models.
*   **Storage**: Native `fs` and `crypto` (for hashing) manage a custom JSON vector store and ingest cache.
*   **Feedback**: `chalk` provides colorized logging for ingestion and query states.
*   **Web Layer**: Native `http` module (no Express) supports a lightweight API and Static/SSE hosting.

## 🚀 Execution Modes

### Web Interface (Recommended)
Starts the HTTP server which provides the streaming Web UI and the JSON API.
```bash
node server/webServer.js
```
Default URL: http://localhost:5174

## 💻 CLI Reference

The application provides a command-line interface for common tasks. Commands should be run from the project root.

### `ingest`
Indexes your documents into the local vector store.
```bash
node cli.js ingest [options]
```
- `-f, --force`: Force rebuild of all embeddings even if the file hasn't changed.
- `-d, --debug`: Enable verbose logging to see chunking and embedding steps.

### `ask <question>`
Perform a single query against your knowledge base.
```bash
node cli.js ask "How do I configure the server?" [options]
```
- `-d, --debug`: Show citations, processing time, and confidence scores.

### `benchmark`
Run accuracy and performance benchmarks using a ground-truth JSON file.
```bash
node cli.js benchmark --file benchmarks.json
```

### `clear-cache`
Removes the ingestion cache, forcing the next `ingest` command to re-process every document.
```bash
node cli.js clear-cache
```

### Start the Web Server
```bash
node server/webServer.js
```

## ⚙️ Configuration (`config.js`)

The application uses a hierarchical configuration system. Settings are merged in the following order: `Defaults` → `Profile Overrides` → `User Settings (ask-docs.config.json)`.

### Key App Settings
- `docsPath`: Path to your `.md` files (default: `../docs`).
- `storePath`: Path to the vector store JSON.
- `activeModel`: The reasoning model currently in use (e.g., `llama-3.2`).
- `chunkChars`: Number of characters per chunk for RAG (default: `600`).
- `topK`: Number of document chunks sent to the model (default: `2`).

### Profiles
- **Standard:** Balanced settings for accuracy.
- **Fast:** Optimized for speed (lower `topK`, smaller `maxNewTokens`, specific threading).

### Supported Models
- **Reasoning:** Llama 3.2 1B, Phi 3.5 Mini, Qwen 2.5 0.5B.
- **Embeddings:** Jina Embeddings v2.

## 📡 API Reference

The server runs by default on port `5174`.

### General Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Returns `{ "status": "ok" }`. |
| `GET` | `/api/models/summary` | Checks local availability and LFS status of configured models. |

### Document Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/docs/list` | Returns a list of all indexed `.md` files. |
| `GET` | `/api/docs/get?name=...` | Returns the raw text of a specific document. |
| `GET` | `/api/docs/search?q=...` | Performs a basic case-insensitive filename search. |

## 🛠 Model Management

Since the app runs locally, model integrity is critical. We provide two utility scripts:

1.  **Check Model Status:**
    ```bash
    node list-models.js
    ```
    Shows which models are found on disk, their sizes, and if they are "Split Weights" (ONNX sidecar files).

2.  **Verify Integrity & Repair:**
    ```bash
    node verify-models.js [--re-download]
    ```
    Calculates SHA-256 hashes for model files and detects Git LFS pointer errors. Use `--re-download` to automatically trigger a fix.

### Directory Structure
```text
.
├── cli.js              # CLI Entry point
├── ingest.js           # Document processing logic
├── ask.js              # Core RAG logic
├── config.js           # Configuration loader
├── server/
│   └── webServer.js    # Node.js HTTP server
├── vector-store/       # Local JSON database
└── web/
    └── dist/           # Compiled frontend assets
```

## 🔒 Security

- **Local Only:** By default, the server listens locally.
- **Path Traversal:** The static file server includes normalization to prevent accessing files outside the `web/dist` directory.
- **No Remote Models:** Configuration includes `allowRemoteModels: false` to force local execution.

---
*Generated by Ask-Docs Documentation Helper.*