<!--
file: architecture.md
purpose: Technical architecture and component interactions.
version: 1.0
-->

# Payment Service Architecture

The platform follows a service-oriented architecture with clear separation of concerns. Sensitive operations are isolated in hardened services, while public-facing APIs remain stateless and horizontally scalable.

## Key Components
### API Gateway
Handles authentication, rate limiting, and routing.

### Payment Orchestrator
Coordinates authorization, capture, and settlement workflows.

### Tokenization Vault
Stores sensitive card data and issues non-sensitive tokens.

### Event Bus
Delivers asynchronous events such as settlement updates and webhook notifications.

## Data Flow Summary
1. Client submits payment request  
2. Gateway authenticates and forwards to orchestrator  
3. Orchestrator interacts with vault and processor  
4. Processor returns authorization result  
5. Event bus publishes settlement events  
