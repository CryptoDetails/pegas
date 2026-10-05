# CODER HANDOFF — PEGAS AGENTIC PAYMENTS V3 ACCEPTANCE FIX

Date: 2026-10-05  
Baseline: `PEGAS_AGENTIC_PAYMENTS_V3_ACCEPTANCE_FIX_INPUT.zip` only  
Task: `PEGAS_AGENTIC_PAYMENTS_V3_ACCEPTANCE_FIX_TASK.md`  
Scope: acceptance fix only; no workflow/product redesign.

## 1. Acceptance-fix result

The critical x402 authority TOCTOU has been removed from the implementation.

The paid authorization sequence is now:

```text
first real unpaid POST
-> exact HTTP 402 + PAYMENT-REQUIRED
-> official x402 SDK decode
-> deep-clone/freeze that PaymentRequired
-> deterministic AUTH evaluation against that frozen challenge
-> atomic one-authorization reservation
-> re-read payment config / fresh kill switch
-> verify frozen authority still matches config
-> verify buyer has >= 10000 atomic configured Devnet USDC
-> x402Client.createPaymentPayload(the exact frozen PaymentRequired object)
-> assert payload.accepted == frozen accepts[0]
-> assert payload.resource == frozen resource
-> official x402 HTTP encode PAYMENT-SIGNATURE
-> one paid POST with the same logical request body
-> seller verifies/settles
-> independent Solana evidence
-> mandate consumed
-> fresh delivery-only HMAC
-> Legal Advisor
-> Reviewer
```

There is no `wrapFetchWithPayment()` path and no `@x402/fetch` runtime dependency. The signing helper contains **no unpaid fetch**. It receives only the already-approved frozen challenge and performs one paid POST after signature creation.

The first challenge object passed to deterministic policy is the same frozen object reference passed into `createPaymentPayload(...)`; deterministic regression coverage asserts object identity with `assert.strictEqual(...)`.

## 2. Official x402 SDK usage

Pinned application dependencies remain:

- `@x402/core`: `2.25.0`
- `@x402/svm`: `2.25.0`
- `@solana/kit`: `5.1.0`
- `@upstash/redis`: `1.35.4`
- `next`: `16.3.8`
- `react`: `19.2.8`
- `react-dom`: `19.2.8`

`@x402/fetch` was removed because the acceptance task explicitly requires the manual payment flow rather than wrapper-driven re-fetch/sign behavior.

Production SDK binding is isolated in `lib/payments/x402-sdk-adapter.ts` and uses the official manual flow:

```text
x402Client
+ registerExactSvmScheme(...)
+ x402HTTPClient
+ client.createPaymentPayload(frozenPaymentRequired)
+ httpClient.encodePaymentSignatureHeader(paymentPayload)
```

Official HTTP codecs are isolated in `lib/payments/x402-http-codec.ts` and used for:

- PAYMENT-REQUIRED encode/decode
- PAYMENT-SIGNATURE decode
- PAYMENT-RESPONSE encode

Generic base64 JSON x402 header helpers are no longer used. The buyer-facing PAYMENT-RESPONSE goes through the SDK encoder rather than returning the facilitator body as a raw transport header.

## 3. Fresh pre-sign authority gates

Immediately before signing, the buyer path now:

1. re-reads payment configuration,
2. requires `AGENTIC_PAYMENTS_ENABLED=true`,
3. verifies network, mint, buyer, seller, amount and per-operation ceiling have not changed,
4. re-verifies the frozen challenge remains inside that authority,
5. checks the exact configured buyer's balance for the exact configured Devnet USDC mint,
6. requires balance >= `10000` atomic before creating any payment payload.

If any gate fails, signature creation is never reached.

Seller defense in depth remains and now also re-checks the current configured frozen-offer authority immediately before facilitator settlement.

## 4. Stable mandate fingerprint

`fingerprint_sha256` now covers immutable authority fields only. Mutable lifecycle `state` is excluded.

The same mandate therefore keeps the same fingerprint across:

```text
active -> consumed
active -> revoked
active -> expired
```

State is still persisted and exposed separately.

## 5. Receipt reconciliation remains non-spending

`POST /api/payments/receipt` can only re-check an already-known settlement signature.

It cannot:

- sign,
- create a payment payload,
- call the facilitator settle endpoint,
- create another authorization,
- invoke Legal,
- restart the workflow.

If existing evidence was pending/unavailable and independent RPC proof later establishes all of the following:

- confirmed/finalized,
- `transfer_matches_offer=true`,
- exact configured buyer,
- exact configured Legal recipient,
- exact configured mint,
- exact `10000` atomic amount,

then one Redis Lua transaction changes an already-authorized active mandate to `consumed`, sets operation state `confirmed`, and stores evidence with `authority.state=consumed`. A concurrent/idempotent recheck accepts an already-consumed mandate but cannot create a second authorization or spend again. Failed/mismatched evidence does not consume the mandate as confirmed.

## 6. Fresh post-payment delivery token

The pre-payment internal HMAC is no longer reused for Legal delivery.

After independently confirmed evidence and mandate consumption, the orchestrator creates a fresh short-lived `delivery_only` envelope preserving exactly:

- `operation_id`
- `run_id`
- `request_fingerprint`
- `legal_context_fingerprint`
- original `absolute_deadline`
- bounded Legal attempt grant

This prevents a valid completed payment from losing Legal delivery only because the earlier <=60s pre-payment token expired.

## 7. Solana public-key and balance validation

A shared base58 decoder/public-key validator now requires exactly 32 decoded bytes for:

- `PAYMENT_BUYER_ADDRESS`
- `LEGAL_PAY_TO`
- facilitator `feePayer`

The setup checker still validates buyer secret -> configured public address and now treats buyer test-USDC balance below one consultation (`10000` atomic) as FAIL rather than merely checking that balance is readable.

No credential-bearing RPC URL is printed.

## 8. Regression coverage added/updated

Deterministic tests cover:

- exact policy-approved first 402 object is the object sent to `createPaymentPayload`
- no second unpaid 402 exists in the signing path
- broader amount cannot be signed
- fresh kill switch disabled => zero signatures
- buyer balance `<10000` => zero signatures
- receipt pending -> confirmed reconciliation consumes an existing authorized mandate only
- receipt route source contains no signer/facilitator/Legal execution path
- mandate fingerprint stable across consumed/revoked/expired lifecycle states
- official SDK PAYMENT-RESPONSE codec assertion is present and executes when `@x402/core` is installed
- fresh delivery-only token after prior token expiry
- malformed seller Solana public key rejected
- malformed facilitator fee payer rejected
- seller-side current authority re-check before settlement

Standard Pegas V3 test contracts were not changed.

## 9. Commands actually run in this coder environment

### PASS

```text
npm run test:phase2
npm run test:phase3
npm run test:phase4:routing
npm run test:phase4:evaluation
npm run test:payments:policy
npm run test:payments:protocol
npm run test:payments:workflow
npm run test:payments:all
```

All commands above returned exit code 0 after the final source changes.

Important: this supplied source baseline contains no installed `node_modules`. `payment-protocol-tests.ts` therefore reports one explicit SDK-runtime assertion as:

```text
SKIP: @x402/core is not installed in this source-only runtime; SDK codec runtime assertion will execute after npm ci.
```

All source-level/protocol authority regressions execute and pass; the official codec round-trip assertion is intentionally conditional only when the package itself is physically absent.

### `payments:setup-check`

Executed. It failed closed before any payment action because owner runtime configuration is intentionally absent:

- `AGENTIC_PAYMENTS_ENABLED` not true
- no RPC
- no buyer secret/address
- no seller address
- no internal auth secret
- no Redis credentials

No signing or settlement was attempted.

### BLOCKED BY CODER RUNTIME NETWORK

The following commands were actually attempted:

```text
npm install --package-lock-only --fetch-timeout=10000 --fetch-retries=0
npm ci --fetch-timeout=10000 --fetch-retries=0
npm run lint
npm run build
```

`npm install --package-lock-only` failed because this execution environment cannot reach npm registry (`getaddrinfo EAI_AGAIN registry.npmjs.org`).

`npm ci` failed for the same network reason while attempting to fetch `@solana/kit`.

Because dependency installation could not complete and the baseline has no `node_modules`:

```text
npm run lint  -> eslint: not found (exit 127)
npm run build -> next: not found (exit 127)
```

**Therefore this handoff does not claim a successful `npm ci`, lint, production build, or a completely regenerated transitive lockfile.** The included `package-lock.json` still reflects the source baseline lock plus the direct dependency cleanup; it is not presented as the required network-regenerated proof.

This is an environment limitation, not hidden as a pass. On a networked review machine, the remaining acceptance proof must be:

```text
npm install
npm ci
npm run test:phase2
npm run test:phase3
npm run test:phase4:routing
npm run test:phase4:evaluation
npm run test:payments:all
npm run lint
npm run build
```

Then commit the resulting complete `package-lock.json`.

## 10. Live Solana Devnet payment

**NOT RUN.**

No live payment, signature, facilitator settlement, or Devnet transaction was executed during this acceptance-fix pass.

The owner-only gate remains:

```text
LIVE_X402_SMOKE_CONFIRM=YES_I_ACCEPT_ONE_DEVNET_TEST_PAYMENT
```

`payments:live-smoke` was not executed in this pass.

## 11. Files changed/new in this acceptance pass

```text
package.json
package-lock.json
app/api/paid-services/legal-consultation/route.ts
app/api/payments/receipt/route.ts
lib/payments/config.ts
lib/payments/mandate.ts
lib/payments/solana-evidence.ts
lib/payments/solana-utils.ts                       # new
lib/payments/store.ts
lib/payments/x402-client.ts
lib/payments/x402-server.ts
lib/payments/x402-sdk-adapter.ts                  # new
lib/payments/x402-http-codec.ts                   # new
lib/workflow/paid-orchestrator.ts
scripts/payment-policy-tests.ts
scripts/payment-protocol-tests.ts
scripts/payment-setup-check.ts
scripts/payment-workflow-tests.ts
CODER_HANDOFF_AGENTIC_PAYMENTS.md
```

## 12. Rollback

Immediate paid-feature kill switch remains:

```text
AGENTIC_PAYMENTS_ENABLED=false
```

Standard Pegas V3 remains independent of paid mode.

## 13. Acceptance status summary

Implemented in source:

- critical frozen-quote TOCTOU fix
- official manual x402 SDK signing path
- official x402 HTTP codec path
- fresh pre-sign kill switch
- buyer balance gate
- safe receipt reconciliation
- stable mandate fingerprint
- fresh delivery HMAC
- Solana public-key validation
- required deterministic acceptance regressions
- no live smoke

Still requiring a networked build environment before final deployment acceptance:

- complete regenerated npm transitive lock
- successful `npm ci`
- SDK codec runtime assertion with installed package
- lint
- production build
