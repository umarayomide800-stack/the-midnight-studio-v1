# Soma Dungeon Deployment Playbook

This document describes a production topology for the Soma Dungeon guest portal, booking API, PostgreSQL data store, Redis lock layer, Stripe payments, and Resend email.

## 1. Production architecture

```text
Guest browser -> Vercel or Netlify (client)
                     |
                     v
              Render Web Service or AWS ECS (server)
                |          |             |
                v          v             v
       Supabase/Neon   Upstash Redis   Stripe + Resend
       PostgreSQL
```

### Recommended provider split

| Concern | Recommended service | Notes |
| --- | --- | --- |
| React/Vite frontend | Vercel or Netlify | Deploy `client`, publish `client/dist`, configure SPA fallback to `index.html`. |
| Express API | Render Web Service or AWS ECS/Fargate | Run `npm run build --workspace server`, then `node server/dist/index.js`. Add health checks at `/api/health`. |
| PostgreSQL | Supabase or Neon | Use the pooled connection string for the app and the direct connection string for migrations. Enable SSL. |
| Redis locks | Upstash Redis | Use TLS and a short TTL for slot locks. Keep Redis failure fail-closed for booking holds. |
| Payments | Stripe | Configure the webhook endpoint at `/api/v1/webhooks/stripe`. Keep the signing secret server-side. |
| Receipts | Resend | Configure a verified sending domain and `EMAIL_FROM`. |

### Frontend deployment

1. Create a Vercel or Netlify project rooted at `client/`.
2. Install from the repository root so npm workspaces resolve `shared/types`.
3. Build with `npm run build --workspace client`.
4. Publish `client/dist`.
5. Set `VITE_API_BASE_URL` to the public API origin, for example `https://api.example.com`.
6. Restrict the API CORS allowlist to the production frontend origin.

### API deployment

Render start command:

```powershell
npm run db:generate --workspace server; npm run build --workspace server; node server/dist/index.js
```

For ECS/Fargate, build the server into a container and expose port `4000`. Put the service behind an HTTPS Application Load Balancer and configure `/api/health` as the target health check. Set `NODE_ENV=production`; never bake secrets into the image.

Run schema changes as a release job, not during every web process boot:

```powershell
npm run db:generate --workspace server
npx prisma migrate deploy --schema server/prisma/schema.prisma
```

Use `db:seed` only for a deliberate non-production environment. Production should receive catalog data through an audited admin process or migration.

## 2. Environment variables

Copy `server/.env.example` to the server secret store. The root `.env.example` documents the complete deployment contract. Values containing keys, passwords, or tokens must be supplied by Vercel, Render, ECS, Supabase, Neon, Upstash, Stripe, or Resend secret management, never committed.

Important connection rule:

- `DATABASE_URL` should be the pooled PostgreSQL URL for normal Prisma queries.
- `DIRECT_DATABASE_URL` should be the direct PostgreSQL URL used by Prisma migrations when the provider supplies one.
- `REDIS_URL` should be a TLS Upstash connection URL.

## 3. Flash-sale protection

The current database `Slot` model tracks `heldCount` and `bookedCount`. Production should add a Redis lock around the hold operation while retaining the PostgreSQL conditional update as the source-of-truth guard.

Recommended hold sequence:

1. Validate the request and calculate the ticket count.
2. Acquire `slot:{slotId}` with `SET key token NX EX 15`.
3. Inside a short PostgreSQL transaction, remove expired holds and run the conditional capacity update:

```sql
UPDATE "Slot"
SET "heldCount" = "heldCount" + $1
WHERE "id" = $2
  AND "startsAt" > NOW()
  AND "bookedCount" + "heldCount" + $1 <= "totalCapacity";
```

4. Create the pending booking and ticket rows.
5. Release the Redis key only if its value still matches the lock token. The lock is a contention reducer, not the correctness boundary.
6. On payment success, transfer the ticket count atomically from `heldCount` to `bookedCount`.

Use a short lock TTL so a crashed API process cannot block a slot indefinitely. Do not use a plain `DEL` without token ownership; a delayed request could delete another request's lock.

### PostgreSQL connection pooling

- Use the provider's pooled URL for web traffic.
- Keep Prisma pool size conservative per API replica. If using PgBouncer in transaction mode, follow Prisma's PgBouncer configuration guidance and use the direct URL for migrations.
- Prisma Accelerate is an alternative for managed pooling and read caching; it does not replace the transactional capacity update.
- Start with a small API replica count and measure pool saturation before scaling horizontally.

### Redis failure policy

If Redis is unavailable, allow read-only show and timeslot requests but fail booking holds closed with a retryable `503`. Never bypass the PostgreSQL capacity guard, and never treat a Redis lock as a booking record.

## 4. Load testing

Use a staging database and Stripe test keys. Do not run these scenarios against production or real payment endpoints.

Install k6 separately, then run:

```powershell
$env:BASE_URL="https://staging-api.example.com"
k6 run loadtest/flash-sale.js
```

The scenario ramps availability reads and hold attempts, including contention on one hot slot. Watch API p95 latency, HTTP 409 rates, PostgreSQL pool utilization, Redis command latency, and the invariant that `bookedCount + heldCount <= totalCapacity` for every slot.

Success criteria for an initial release:

- No capacity invariant violations.
- No successful hold response after the slot reaches capacity.
- p95 read latency below 500 ms during the planned peak.
- Hold transaction p95 below 1 second.
- No unbounded pending holds after their ten-minute expiry.
- Stripe webhook retries remain idempotent.

## 5. Release checklist

- Run `npm run typecheck` and `npm run build` from the repository root.
- Run `npx prisma validate --schema server/prisma/schema.prisma` with production-like environment variables.
- Run `npx prisma migrate deploy` against a staging database.
- Verify `GET /api/health` through the public API load balancer.
- Verify CORS from the deployed frontend origin.
- Test a Stripe test-mode payment and signed webhook delivery.
- Confirm expired holds release `heldCount` and successful payment moves counts to `bookedCount`.
- Confirm logs do not include payment secrets, QR payloads, or customer card data.
- Take a database backup and record the migration before production rollout.

## 6. Scaling path

Scale the stateless API horizontally behind the load balancer. Keep ticket capacity decisions in PostgreSQL transactions, use Redis only for short-lived contention control, and make webhook processing idempotent by PaymentIntent id. Add structured logs and metrics before increasing replica count so capacity, queueing, and provider rate limits remain visible during Halloween traffic.
