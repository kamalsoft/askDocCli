<!--
file: exceptions.md
purpose: Exception flow and failure scenarios.
version: 1.0
-->

# Exception Flow

Exceptions occur when a transaction cannot complete normally due to system or network failures.

## Mid-Processing Failures
A transaction may fail after:
- Authorization succeeds  
- Capture request is sent  
- Processor times out  

The orchestrator triggers **compensating actions** to restore consistency.

## Compensating Actions
- Reverse authorization  
- Cancel capture  
- Mark transaction as `PENDING_REVIEW`  
- Emit exception event to event bus  

## Exception Events
Published to:
- Merchant webhooks  
- Internal monitoring systems  
- Fraud review queues  
