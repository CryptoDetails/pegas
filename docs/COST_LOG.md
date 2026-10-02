# PEGAS COST LOG

Purpose: record real experiment costs for the final README and portfolio case. Do not estimate final cost from planned pricing; record actual values from invoices/session data.

## Rules

1. Record observed pricing separately from actual billed spend.
2. Record GPU runtime for each paid session.
3. Record storage costs only if storage is actually created.
4. Record credits/referrals separately from gross infrastructure cost.
5. Final portfolio should show both gross spend and net out-of-pocket spend if credits are applied.

## Known pre-deployment observations

| Date | Item | Observation | Billed? |
|---|---|---|---|
| 2026-10-01 | RunPod GPU candidate | NVIDIA L4, 24 GB, shown at approximately $0.49/hour | No |
| 2026-10-01 | Container disk | 30 GB shown in Pod configuration | No Pod deployed |
| 2026-10-01 | Network Volume | 10 GB option shown at $0.70/month | No, not created |
| 2026-10-01 | Referral credit | $5 bonus only after $10 spend, per user | No |

## Paid session log

Add one row for every paid GPU session.

| Session | Date | GPU | Hourly price | Start | Stop | Runtime hours | GPU cost | Notes |
|---|---|---|---:|---|---|---:|---:|---|
| 1 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | First model setup / smoke test |

## Storage log

| Date | Storage type | Size | Rate | Duration | Cost | Purpose |
|---|---|---:|---:|---|---:|---|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Other costs

| Date | Service | Cost | Notes |
|---|---:|---:|---|
| TBD | TBD | TBD | TBD |

## Credits / discounts

| Date | Source | Amount | Applied? | Notes |
|---|---|---:|---|---|
| TBD | RunPod referral | $5.00 | TBD | Eligible only after required spend condition is met |

## Final summary

Fill only after the experiment is complete.

| Metric | Actual |
|---|---:|
| Gross GPU spend | TBD |
| Gross storage spend | TBD |
| Other infrastructure spend | TBD |
| Gross experiment cost | TBD |
| Credits applied | TBD |
| Net out-of-pocket cost | TBD |
| Total GPU runtime | TBD |

## Portfolio note template

> I ran the model for approximately **[X] GPU-hours** on **[GPU]**. The gross infrastructure cost of the experiment was **$[X]**, with **$[Y]** in credits/discounts applied. The final out-of-pocket cost was **$[Z]**.
