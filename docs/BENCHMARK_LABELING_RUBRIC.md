# PEGAS BENCHMARK LABELING RUBRIC v1

Status: FROZEN BASELINE
Date: 2026-10-01

This rubric defines how the 25-case benchmark ground truth is interpreted. Expected labels must not be changed after seeing model outputs merely to improve scores.

## Categories

### integration
Technical product integration: API, SDK, endpoints, credentials, sandbox, implementation, integration requirements.

### support
An existing user/product problem or help request: access, errors, crashes, missing funds, or questions about using the product.

### partnership
Business-to-business cooperation: commercial terms, partner/referral programs, adding a service as a partner, or long-term business cooperation.

### marketing
Joint promotion: campaigns, giveaways, social posts, co-marketing, brand assets, or content collaboration.

### media
Media/content-platform request: interview, comment, quote, podcast, press request.

### billing
Invoice, payment, billing amount, accounting-related request.

### other
Anything that does not fit the categories above.

## Primary-action rule for ambiguous messages

If a message contains multiple themes, classify it by the main action the recipient needs to take now.

Examples:

- "We want to integrate the API, send documentation" -> `integration`
- "We want to discuss commercial terms and then integrate" -> `partnership` if the immediate request is business discussion
- "Our API integration is already underway but an endpoint fails" -> `integration`
- "We want joint content and cross-promotion" -> `marketing`
- "We need a quote for an article" -> `media`

## Priority

### high
Clear urgency or serious consequence, such as:
- explicit near-term deadline;
- loss of money;
- loss of access;
- critical product failure;
- active integration blocked;
- explicit request for an immediate/today response.

### medium
A concrete action request without clear urgency.

### low
Informational, preliminary, or non-critical request.

## Priority rule

Category and priority are evaluated independently.

A support or billing case is not automatically high. A partnership case can be high if a real deadline is explicit.

## Tie-break rule

When two labels still seem plausible:

1. classify the current request, not the sender's broader company context;
2. do not infer hidden intent;
3. use only information explicitly present in the message;
4. if no category fits clearly, use `other`.

## Evaluation fields

For every benchmark item record:

- `categoryCorrect`
- `priorityCorrect`
- `jsonValid`
- `latencyMs`

Aggregate metrics:

- Category accuracy
- Priority accuracy
- Valid JSON rate
- Median latency
- P95 latency

Manual error-analysis buckets:

- taxonomy ambiguity
- priority ambiguity
- model reasoning
- prompt weakness
- schema/output issue
