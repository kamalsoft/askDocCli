# Model Configuration

Ask-Docs is built on a hybrid RAG (Retrieval-Augmented Generation) architecture. This document defines the responsibilities of local vs. remote models, operating instructions, and non-functional requirements.

## 1. Architectural Responsibilities

### 1.1 Embedding Models (Strictly Local)
*   **Responsibility**: Converting document chunks and user queries into high-dimensional vectors.
*   **Constraint**: **Strictly Local**. To ensure maximum data privacy, the "knowledge" of your documents is never sent to a third-party API for indexing.
*   **Engine**: ONNX Runtime via Transformers.js.
*   **Default**: `Xenova/jina-embeddings-v2-base-en`.

### 1.2 Reasoning Models (Hybrid/Toggle)
*   **Responsibility**: Synthesizing the final answer based on retrieved context.
*   **Constraint**: **Flexible**. Can be toggled between local SLMs (Small Language Models) for privacy/offline use, or OpenRouter for high-reasoning capabilities.
*   **Engine**: ONNX Runtime (Local) or HTTPS/REST (OpenRouter).

---

## 2. Operating Instructions

### 2.1 Initial Setup
1.  **Install Dependencies**: `npm install`
2.  **Download Local Models**: Run `bash download_models.sh`. This fetches the ONNX weights for both Embedding and Reasoning.
3.  **Verify Integrity**: Run `node verify-models.js` to ensure weights are not LFS pointers.

### 2.2 Configuring `ask-docs.config.json`
Create this file in the root directory to override defaults.

```json
{
  "appSettings": {
    "inferenceMode": "auto",
    "activeModel": "llama-3.2",
    "openrouter": {
      "apiKey": "sk-or-v1-...",
      "model": "google/gemini-2.0-flash-001"
    }
  }
}
```

### 2.3 Executing Commands
*   **Ingestion**: `node cli.js ingest`. (Always uses local embedding models).
*   **Query**: `node cli.js ask "question"`. (Uses the mode defined in `inferenceMode`).
*   **Interactive**: `node cli.js tui`. (Supports real-time streaming from either local or remote sources).

---

## 3. Inference Modes (`appSettings.inferenceMode`)

| Mode | Description | Reliability |
| :--- | :--- | :--- |
| `local` | Uses Hugging Face models via ONNX. | High (No internet required). |
| `openrouter` | Uses OpenRouter API. | Medium (Requires API Key & Internet). |
| `auto` | Tries OpenRouter; falls back to `local` on failure. | **Highest** (Resilient to network issues). |

---

## 4. Non-Functional Requirements (NFRs)

### 4.1 Privacy & Security
*   **Zero-Leaking Indexing**: All vectorization (Embedding) is performed locally. Your document contents are never transmitted to an external service during the `ingest` phase.
*   **Selective Transmission**: If using `openrouter` mode, only the specific chunks of text retrieved for a single query are sent to the API.

### 4.2 Portability & Offline Capability
*   **Air-Gapped Ready**: By setting `inferenceMode` to `local` and `allowRemoteModels` to `false`, the system functions entirely without an internet connection once models are downloaded.

### 4.3 Reliability (Graceful Degradation)
*   **The "Auto" Fallback**: The system detects API failures (401, 429, 500) or timeouts. In `auto` mode, the TUI will notify the user of the failure and immediately load the local ONNX model to fulfill the request.

### 4.4 Performance
*   **Compute Efficiency**: Local models utilize ONNX Runtime with configurable threading (`intraOpNumThreads`).
*   **Response Latency**: Local SLMs (like Llama-3.2 1B) provide sub-second "Time to First Token" on modern CPUs, whereas OpenRouter provides high-quality reasoning at the cost of network round-trips.

---

## 5. Model Registry (Reference)

### Reasoning Models (Local)
Defined in `config.js` under `reasoningModels`. These are the targets for the `local` pathway:
- **Llama 3.2 1B**: Optimized for speed.
- **Phi 3.5 Mini**: High accuracy for its size.
- **Qwen 2.5 0.5B**: "Tiny" footprint for low-spec hardware.

### Embedding Models (Local)
Defined in `config.js` under `embeddingModels`. Used for both query vectorization and document indexing:
- **Jina Embeddings v2**: Default local model.

---

## 6. Troubleshooting ONNX & Loading Errors

### 6.1 "Protobuf parsing failed"
**Cause**: This usually means the `.onnx` file is not a valid model. 
**Solution**: 
- Check the file size. If it is < 2KB, it is a **Git LFS pointer**. 
- Run `git lfs pull` or use the `download_models.sh` script to fetch actual weights.

### 6.2 "Failed to load model... _data file not found"
**Cause**: Large models (Llama-3.2, Phi-3.5) are often split into two files: `model.onnx` and `model.onnx_data`.
**Solution**: Ensure both files exist in the same directory. The `_data` file contains the actual weight tensors.

### 6.3 "Aborted (core dumped)" or "Out of Memory"
**Cause**: The local machine does not have enough RAM to load the model.
**Solution**: 
- Close memory-intensive applications.
- Switch `activeModel` in `config.js` to `qwen-0.5b` (the smallest footprint).
- Reduce `intraOpNumThreads` in `config.js` to limit CPU usage.

### 6.4 Slow Time-to-First-Token
**Cause**: ONNX initialization is expensive, or context length is too high.
**Solution**:
- Use the `fast` profile in `appSettings`.
- Check if your CPU supports AVX2/AVX-512 instructions (standard on modern hardware).

### 6.5 OpenRouter Fallback Latency
**Cause**: In `auto` mode, the app waits for a network timeout before switching to local.
**Solution**: Ensure your `OPENROUTER_API_KEY` is correct. If your internet is consistently poor, set `inferenceMode` to `local` permanently.

---
*Note: If `auto` mode is used without an `OPENROUTER_API_KEY` set in the environment or config, the system will immediately trigger the local fallback.*
```

```json
{
  "appSettings": {
    "inferenceMode": "auto",
    "activeModel": "llama-3.2",
    "openrouter": {
      "apiKey": "sk-or-v1-YOUR_KEY_HERE",
      "model": "google/gemini-2.0-flash-001"
    }
  }
}
```

### Example: Forced Local (Privacy) Setup

```json
{
  "appSettings": {
    "inferenceMode": "local",
    "activeModel": "phi-3.5",
    "allowRemoteModels": false
  }
}
```

## Hugging Face Local Model Configuration (`reasoningModels` and `embeddingModels`)

These sections in `config.js` define the registry of models that can be executed via ONNX.

### `reasoningModels`
Lists the Small Language Models (SLMs) available for local reasoning.
-   **`name`**: Display name.
-   **`repo`**: Hugging Face repo ID.
-   **`targetFile`**: The `.onnx` file to load.
-   **`template`**: The prompt structure (System/User/Assistant tags) required by the model.

### `embeddingModels`
Defines the model used to turn your documents into searchable vectors.

---
*Note: If you use the `auto` mode and have no internet connection, the system will pause briefly for the API timeout before switching to the local ONNX model.*

## 7. Data Security & Encryption

The vector store (`docs.json`) contains the semantic representation and raw text of your indexed documents. Protecting this file is essential for maintaining data privacy.

### 7.1 Security at Rest
The vector store is currently stored as a standard JSON file. It is **not encrypted by the application itself**. To ensure data remains secure while the machine is offline or unattended, it is recommended to:
*   Use **Full Disk Encryption** (e.g., FileVault on macOS, BitLocker on Windows, or LUKS on Linux).
*   Configure file system permissions on the `vector-store/` directory so that only the user account running the application has read/write access.

### 7.2 Integrity and Hashing
During the `ingest` phase, the system generates SHA-256 hashes for every document. These are stored in `cache.json`. This mechanism ensures that the vector store accurately reflects the state of your local `docs/` folder and allows the system to detect if source files have been modified since the last index.

### 7.3 Network Isolation
*   **Local Mode**: When `inferenceMode` is set to `local`, no document data or user queries ever reach the network.
*   **Remote Mode**: In `openrouter` or `auto` modes, only the specific chunks of text retrieved as context are sent over an encrypted HTTPS connection to the reasoning model. The full vector store is never uploaded.

### 7.4 Air-Gap Strategy
For maximum security, Ask-Docs can be deployed on machines without network interfaces (air-gapped) once the necessary ONNX models have been downloaded and verified using the provided `verify-models.js` script.
        ```json
        {
          "appSettings": {
            "openrouter": {
              "apiKey": "sk-or-v1-..."
            }
          }
        }
        ```
-   **`model`**: The specific model identifier to use from OpenRouter. You can find a list of available models on the OpenRouter website.
    *   **Default:** `"google/gemini-2.0-flash-001"`
-   **`baseUrl`**: The base URL for the OpenRouter API.
    *   **Default:** `"https://openrouter.ai/api/v1"`

**Example `ask-docs.config.json` snippet for OpenRouter:**

```json
{
  "appSettings": {
    "inferenceMode": "openrouter",
    "openrouter": {
      "apiKey": "sk-or-v1-YOUR_OPENROUTER_API_KEY",
      "model": "mistralai/mistral-7b-instruct-v0.2",
      "baseUrl": "https://openrouter.ai/api/v1"
    }
  }
}
```

## Hugging Face Local Model Configuration (`reasoningModels` and `embeddingModels`)

These sections define the local models used for reasoning and embeddings.

### `reasoningModels`
This object lists the supported Small Language Models (SLMs) that run locally.
-   **`name`**: A human-readable name for the model.
-   **`repo`**: The Hugging Face repository ID (e.g., `"onnx-community/Llama-3.2-1B-Instruct"`).
-   **`targetFile`**: The specific ONNX file within the repository to load.
-   **`dtype`**: The data type for inference (e.g., `"q4"` for 4-bit quantization).
-   **`template`**: Chat template for the model (e.g., Llama-3.2 uses specific tokens).

### `embeddingModels`
This object lists the supported embedding models.
-   **`name`**: A human-readable name for the model.
-   **`repo`**: The Hugging Face repository ID (e.g., `"Xenova/jina-embeddings-v2-base-en"`).
-   **`targetFile`**: The specific ONNX file within the repository to load.