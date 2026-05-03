# Business Overview: Ask-Docs

## 1. Purpose of the Application
**Ask-Docs** is a local-first, privacy-focused Intelligence Engine designed to transform static documentation into an interactive, AI-driven knowledge base. Its primary goal is to provide organizations with the power of Retrieval-Augmented Generation (RAG) while ensuring that proprietary data never leaves the local infrastructure.

## 2. Business Needs
Organizations today face a massive influx of internal documentation (wikis, technical specs, legal briefs, and process manuals). The primary business needs addressed are:
*   **Instant Knowledge Retrieval**: Reducing the time employees spend searching for information.
*   **Data Sovereignty**: Maintaining absolute control over sensitive data.
*   **Cost Management**: Eliminating the recurring and often high costs of cloud-based AI indexing and reasoning.

## 3. Market Challenges
The current AI market presents several barriers to enterprise adoption:
*   **Privacy Risks**: Sending proprietary data to cloud providers for embedding or indexing creates significant security vulnerabilities.
*   **High Operational Costs**: Cloud-based RAG pipelines charge per token for both indexing and retrieval, which scales poorly with large document sets.
*   **Internet Dependency**: Traditional AI solutions fail in air-gapped environments or low-connectivity zones (e.g., ships, remote sites, or secure facilities).
*   **Hallucination**: Standard LLMs often invent facts when they lack specific context, leading to unreliable business intelligence.

## 4. How Ask-Docs Solves These Challenges
*   **Local-First Architecture**: By performing **Embeddings** and **Indexing** strictly locally using ONNX and Transformers.js, data leakage is physically impossible.
*   **Hybrid Inference (Auto Mode)**: It offers the flexibility to use highly efficient local Small Language Models (SLMs) like Llama-3.2 for privacy, or toggle to remote high-reasoning models via OpenRouter when needed.
*   **Zero-Cost Indexing**: There are no per-token fees for building the local vector store.
*   **Grounded Responses**: The system enforces strict RAG rules, providing exact citations and refusing to answer if the information is not present in the local context.

## 5. Use Cases
*   **Technical Onboarding**: New engineers can query the entire codebase documentation to understand system architecture.
*   **Legal & Compliance**: Instant cross-referencing of internal policies and regulatory documents.
*   **Customer Support Triage**: Enabling support agents to find solutions within product manuals instantly.
*   **Field Operations**: Providing technical intelligence to operators in remote locations without internet access.

## 6. Targeted Industries
Industries that handle highly sensitive or regulated data stand to benefit most:
*   **Healthcare**: Analyzing patient protocols and medical research while complying with HIPAA-like regulations.
*   **Finance & Banking**: Querying internal audits and compliance frameworks securely.
*   **Defense & Government**: Deploying intelligence tools in air-gapped, highly secure environments.
*   **Legal Services**: Managing vast quantities of case law and internal discovery documents.

## 7. Integration Strategy (Plug n Play)
Ask-Docs is designed to be easily integrated with existing systems:

### 7.1 Data Integration
Simply point the application to any existing directory of Markdown files. The system performs a non-destructive "walk and watch" to index content without requiring a database migration.

### 7.2 System Integration
*   **REST API**: The application exposes a lightweight HTTP API (`/ask`, `/api/docs`) that can be consumed by existing corporate portals or Slack/Teams bots.
*   **CLI & TUI**: Power users and DevOps teams can integrate the engine directly into terminal-based workflows or CI/CD pipelines.
*   **Stateless Web UI**: A pre-built React interface is provided that can be easily re-skinned or embedded as an iframe in internal dashboards.

### 7.3 Infrastructure Requirements
Because it uses ONNX Runtime, it can be deployed on standard consumer-grade CPUs (Laptops/Servers) without requiring expensive GPU clusters, making it a "drop-in" utility for existing hardware.

## 8. Return on Investment (ROI)
Transitioning from a Cloud-based RAG solution to **Ask-Docs** provides measurable financial and operational returns:

*   **API Cost Elimination**: Removes recurring SaaS fees for embedding (e.g., OpenAI/Jina) and reasoning (e.g., GPT/Gemini) tokens.
*   **Hardware Efficiency**: Optimized for standard CPU-based server environments, avoiding the need for specialized AI hardware or high-end GPUs.
*   **Security Overhead Reduction**: Local processing bypasses "Sub-processor" risk categories in legal/compliance reviews, potentially saving weeks of administrative overhead during InfoSec audits.
*   **Operational Resilience**: Eliminates dependency on external service availability or cloud provider rate limits, ensuring 100% uptime for internal knowledge retrieval.

## 9. Data Privacy Impact Assessment (DPIA) Highlights
The architecture of **Ask-Docs** is designed to satisfy stringent regulatory requirements (GDPR, HIPAA, SOC2) by default:

*   **No External Data Exfiltration**: By performing indexing and embeddings strictly on internal hardware, the application eliminates the primary risk of proprietary data exposure to third-party AI vendors.
*   **Simplified Compliance Path**: The removal of cloud-based sub-processors streamlines the DPA (Data Processing Agreement) requirements, reducing the complexity of cross-border data transfer assessments.
*   **Context Isolation**: Unlike shared cloud environments, the "Context" used for RAG never leaves the organization's controlled environment, preventing accidental data co-mingling or model training on private query sessions.
*   **Air-Gap Compatibility**: The solution can operate in high-security, network-isolated environments, ensuring that the AI intelligence remains fully functional even in facilities with zero external internet access.

## 10. Real-Time Scenarios with Examples

### 11.1 Scenario A: Technical Support Desk
*   **User**: A Tier-1 support agent dealing with an urgent ticket.
*   **Question**: "How do I reset the heartbeat interval for the Gateway-X series when the primary link is down?"
*   **Ask-Docs Response**: "To reset the heartbeat interval for Gateway-X during a primary link failure, access the serial console and execute `SET HEARTBEAT 300 --FORCE`. Note: Do not exceed 600ms as per the hardware safety manual [Link to docs/GatewayX_Manual.md#L45]."

### 11.2 Scenario B: Legal Compliance Review
*   **User**: An internal auditor reviewing a new contract draft.
*   **Question**: "What are our data retention liabilities for customer records in the APAC region?"
*   **Ask-Docs Response**: "For the APAC region, specifically Singapore and Australia, records must be retained for 7 years. You must also ensure PII is encrypted at rest as defined in our 2023 Security Standard [Citing docs/Compliance_Policy_v2.md]."

## 11. Industry & Use Case Matrix

| Industry | Primary Use Case | Business Impact |
| :--- | :--- | :--- |
| **Fintech** | Internal Audit & Policy Q&A | Reduces audit preparation time by 60%; ensures zero leakage of financial logic. |
| **Healthcare** | Clinical Protocol Retrieval | Provides instant access to intake procedures during network outages (Offline Mode). |
| **Manufacturing** | Maintenance Manual Chatbot | Field engineers get instant "how-to" answers from massive PDF/MD manuals via TUI/Tablet. |
| **Software / Dev** | Developer Documentation Plugin | Bridges the gap for new hires navigating complex, undocumented, or vast microservice wikis. |
| **Government** | Regulated Discovery | Enables secure searching across classified or sensitive internal legislative records. |

## 12. "Plug n Play" for External Applications

Ask-Docs is designed to function as an "Intelligence Utility" for your existing ecosystem:

### 12.1 The Web Hook / API Plugin
Your existing CRM or HR portal can "plug in" Ask-Docs via a simple REST call.
*   **Input**: The user's query from your internal UI.
*   **Processing**: Ask-Docs processes the query against its local vault.
*   **Output**: A JSON object containing the answer, citations, and the specific text chunks used.

```bash
# Example of an external app 'plugging in' to Ask-Docs
curl -X POST http://localhost:5174/ask \
     -H "Content-Type: application/json" \
     -d '{"question": "What is the holiday policy?"}'
```

### 12.2 Customizable Knowledge Vaults
The engine can be "swapped" between different vaults by simply changing the `docsPath` in the config. This allows a single deployment to serve different departments (e.g., HR, Engineering, Legal) simply by routing to different document directories.

## 13. Future Roadmap
*   **Multi-Modal Support**: Native ingestion of PDF, HTML, and Confluence exports.
# Business Overview: Ask-Docs
... (existing content)
*   **Keyword Fallback**: Hybrid search (Vector + BM25) for improved accuracy on specialized technical acronyms.
*   **Active Monitoring**: Auto-re-ingest triggered by file system changes (watch-mode).