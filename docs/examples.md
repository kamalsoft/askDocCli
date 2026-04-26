<!--
file: examples.md
purpose: Sample requests and responses.
version: 1.0
-->

# API Examples

## Create Payment Request
```json
POST /payments
{
  "amount": 5000,
  "currency": "USD",
  "source": "tok_abc123",
  "metadata": { "orderId": "A1001" }
}
