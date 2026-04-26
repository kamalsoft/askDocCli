<!--
file: authentication.md
purpose: Authentication and request signing.
version: 1.1
-->

# Authentication Guide

All API requests must be authenticated using API keys and HMAC signatures. This ensures message integrity and prevents tampering during transit.

## API Keys
Each client receives:
- A **public key** for identification  
- A **secret key** for signing requests  

## HMAC Signing
Requests must include:
- `X-Signature` header  
- HMAC-SHA256 signature of the request body  

## Webhook Verification
Webhook payloads include:
- Timestamp  
- Signature  
- Replay protection token  

Clients must verify signatures before processing events.
