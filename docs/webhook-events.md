<!--
file: webhook-events.md
purpose: Webhook event types and payload formats.
version: 1.0
-->

# Webhook Events

The platform delivers asynchronous events to merchant endpoints using signed webhook requests.

## Delivery Guarantees
- At-least-once delivery  
- Ordered per transaction  
- Retries with exponential backoff  

## Event Types

### `payment.authorized`
Sent when a payment is successfully authorized.

```json
{
  "type": "payment.authorized",
  "id": "evt_123",
  "data": {
    "paymentId": "pay_123",
    "amount": 5000,
    "currency": "USD"
  }
}
```