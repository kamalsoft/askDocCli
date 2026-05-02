# Skills Maintenance Instructions

This directory serves as the source of truth for the technical and strategic competencies required to develop and maintain the **Ask-Docs** project. These skills are used to communicate the project's value to stakeholders and to ensure that contributors understand the core engineering pillars.

## 📋 How to Update Skills

When significant architectural changes or new features are implemented, follow these steps to update the skills profile:

1.  **Audit the Change**: Identify if the new feature introduces a new technology (e.g., a new vector database like LanceDB) or a new architectural pattern (e.g., Hybrid Search).
2.  **Update `summary.md`**:
    *   Add or refine bullet points in the core competencies section.
    *   Ensure action-oriented language (e.g., "Designing...", "Implementing...", "Optimizing...").
    *   Maintain the focus on the project's primary NFRs: **Privacy, Performance, and Offline-First**.
3.  **Refine the Objective**: Update the project objective if the strategic direction shifts (e.g., from strictly local to a hybrid local-cloud model).

## 🛠 Core Competency Categories

Maintainers should categorize skills into these established pillars:

*   **AI/ML Orchestration**: Usage of Transformers.js, ONNX Runtime, and model quantization (q4).
*   **RAG Engineering**: Logic involving chunking, embedding, similarity search, and reranking.
*   **System Programming**: Asynchronous Node.js, file system management, and configuration hierarchies.
*   **Interface Design**: CLI development with `commander`, TUI dashboards with `blessed`, and Web UIs with React.
*   **Privacy & Security**: Implementation of local-only pathways and data sovereignty controls.
*   **Role Orchestration**: Managing the interplay between AI, Frontend, and System engineers via `matrix.md`.

## 📈 High-Value Skills to Track

As the project moves toward version 1.2.0, prioritize documenting skills related to:
*   **Multi-modal Ingestion**: Parsing and chunking non-Markdown formats (PDF, HTML).
*   **Hybrid Search**: Combining semantic vector search with keyword-based BM25 algorithms.
*   **Agentic Workflows**: Multi-hop reasoning and query rewriting logic.

## 📌 Review Cycle

The skills summary should be reviewed:
*   After every major release.
*   Whenever a new external API or library is added to `package.json`.
*   When preparing documentation for external integration/plugins.

---
*Maintained by the Ask-Docs Engineering Team.*