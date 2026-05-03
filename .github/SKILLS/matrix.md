# Role-Based Skills Matrix

This matrix defines the primary and secondary technical responsibilities for different contributor roles within the **Ask-Docs** project.

## 📊 Competency Mapping

| Competency | AI Engineer | Frontend Engineer | System/CLI Engineer |
| :--- | :---: | :---: | :---: |
| **AI/ML Orchestration** (ONNX, Transformers.js) | Primary | N/A | Secondary |
| **RAG Engineering** (Chunking, Retrieval logic) | Primary | Secondary | Secondary |
| **Interface Design** (React, Vite, CSS) | N/A | Primary | N/A |
| **Terminal UI Design** (Blessed, TUI Dashboards) | N/A | Secondary | Primary |
| **System Programming** (Async Node.js, File I/O) | Secondary | Secondary | Primary |
| **Vector Store Management** (JSON/Metadata) | Primary | N/A | Primary |
| **Privacy & Security** (Local-only NFRs) | Primary | Secondary | Primary |
| **Data Visualization** (Mermaid, Streaming UI) | Secondary | Primary | Secondary |

## 🛠 Role Definitions & Ownership

### 1. AI Engineer
Responsible for the "intelligence" layer of the application.
- **Ownership**: Embedding logic, model registry, quantization strategy, and answer synthesis accuracy.
- **Key Files**: `ask.js`, `embed.js`, `synthesizer.js`, `verify-models.js`.

### 2. Frontend Engineer
Responsible for the browser-based documentation portal and visual UX.
- **Ownership**: The React application, documentation rendering, real-time streaming state management, and Mermaid diagram integration.
- **Key Directory**: `web/`.

### 3. System/CLI Engineer
Responsible for the core orchestration, performance, and terminal interfaces.
- **Ownership**: Asynchronous ingestion pipeline, TUI development, CLI command structure, and configuration hierarchy.
- **Key Files**: `cli.js`, `tui.js`, `panel.js`, `ingest.js`, `ask-docs-UI/uiServer.js`.

---
*Note: All roles share the responsibility for maintaining the project's Privacy NFR, ensuring that no document data is leaked to external APIs regardless of the inference pathway used.*

## 🎓 Learning Path: Frontend to AI Engineer

For Frontend developers looking to transition into AI Engineering within the Ask-Docs ecosystem, prioritize these milestones:

1. **Streaming & Asynchrony**: Master Server-Sent Events (SSE) and real-time state management for high-frequency token streams.
2. **RAG Lifecycle**: Understand the pipeline of turning static content into vectors (Markdown → Chunker → Embedder → Vector DB).
3. **Local Inference (ONNX)**: Study how `onnxruntime-node` executes models on the CPU and the performance trade-offs of quantization (q4).
4. **Agentic Reasoning & Skills**:
   - **Reasoning Patterns**: Implement "Chain-of-Thought" (CoT) prompting, utilizing the `<thought>` and `<answer>` tag isolation found in `synthesizer.js`.
   - **Structured Outputs**: Learn to enforce reliable JSON or XML schema responses for predictable system-to-system communication.
   - **Self-Correction Logic**: Develop "Loop Recovery" heuristics to detect and break repetitive model behaviors or hallucination patterns.
   - **Function Orchestration**: Advance to "Agentic Tool Use" by exposing internal system functions (like ingestion or search) as executable tools for the LLM.