<!--
file: transactions.md
purpose: Transaction lifecycle and processing flow.
version: 1.0
-->

# Transaction Lifecycle

A payment transaction progresses through multiple phases, each with distinct responsibilities and failure modes.

## Authorization Phase
The system validates:
- Card token  
- Merchant configuration  
- Fraud rules  
- Available funds  

The processor returns an **authorization code** or a decline reason.

## Capture Phase
Funds are moved from the cardholder’s bank to the merchant’s acquiring bank.

## Settlement Phase
The acquiring bank batches transactions and settles them with card networks. Settlement events are delivered asynchronously via webhooks.

## Reconciliation
Merchants compare:
- Authorization logs  
- Capture logs  
- Settlement reports  
to ensure financial accuracy.
