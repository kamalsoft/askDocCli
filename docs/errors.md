<!--
file: errors.md
purpose: Error codes and handling strategies.
version: 1.0
-->

# Error Handling Guide

The API returns structured error responses with machine-readable codes.

## Common Error Codes
| Code | Meaning |
|------|---------|
| `INVALID_REQUEST` | Missing or malformed fields |
| `AUTH_FAILED` | Invalid API key or signature |
| `CARD_DECLINED` | Issuer rejected the transaction |
| `INSUFFICIENT_FUNDS` | Cardholder has insufficient balance |
| `PROCESSING_ERROR` | Upstream processor failure |

## Retry Logic
- **Idempotent operations** (e.g., GET, POST with idempotency key) may be retried  
- **Non-idempotent operations** must not be retried automatically  

## Validation Errors
The API returns:
- Field name  
- Expected format  
- Human-readable message  
