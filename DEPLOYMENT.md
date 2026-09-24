# The Midnight Studio Deployment Playbook

This document describes a production topology for The Midnight Studio guest portal, booking API, PostgreSQL data store, Stripe payments, and Resend email. Redis remains optional for future contention reduction.

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
| Optional Redis | Upstash Redis | Available for future contention reduction; PostgreSQL remains the booking correctness boundary. |
| Payments | Stripe | Configure the webhook endpoint at `/api/v1/webhooks/stripe`. Keep the signing secret server-side. |
| Receipts | Resend | Configure a verified sending domain, `EMAIL_FROM`, and optional `OWNER_EMAIL` for an owner copy. |

### Frontend deployment

1. Deploy the `the-midnight-studio-web` static site from `render.yaml`, or create an equivalent Vercel/Netlify project rooted at `client/`.
2. Install from the repository root so npm workspaces resolve `shared/types`.
3. Build with `npm run build --workspace client` and publish `client/dist`.
4. Set `VITE_API_BASE_URL` to the public API origin: `https://the-midnight-studio-api.onrender.com` for the included Render blueprint.
5. Set `VITE_STRIPE_PUBLISHABLE_KEY` to the matching Stripe publishable key. Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` only on Render.
6. Set the API service's `CLIENT_ORIGIN` to the actual public frontend origin, then redeploy the frontend after changing `VITE_API_BASE_URL` because Vite embeds it at build time.

For the included Render blueprint, the API service must be a Node web service with `startCommand: node server/dist/index.js`; the static site must not be used as the API service. After the first API deploy, verify both `https://the-midnight-studio-api.onrender.com/` and `/api/health` return JSON. A generic `Not Found` response means the Render service is still pointing at the wrong service or has not deployed this blueprint.

### API deployment

For the Render service, leave **Root Directory** blank (the repository root). The root `package.json` defines the `client`, `server`, and `shared/types` workspaces; setting Root Directory to `server` makes commands using `--workspace server` fail with `No workspaces found`.

Render release command:

```powershell
npm run db:push --workspace server; npm run db:seed --workspace server
```

The seed is idempotent: it upserts catalog records and adds missing slots without deleting existing bookings. This release command is what populates a new production database so the booking calendar has availability.

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
- `REDIS_URL` is optional; PostgreSQL transaction locking is the current booking concurrency control.

### Render PostgreSQL setup

Create a PostgreSQL database with Render, Neon, Supabase, or another managed PostgreSQL provider before deploying the API. You need these values in the Render API service environment:

| Render variable | Value | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | The provider's pooled or runtime connection string | Prisma queries while the API is running |
| `DIRECT_DATABASE_URL` | The provider's direct, non-pooled connection string | Prisma `db push` and migrations |

The values normally look like this, but use the exact URLs supplied by your provider:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public&sslmode=require
DIRECT_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public&sslmode=require
```

For a Render-managed PostgreSQL database, copy the **Internal Database URL** into `DATABASE_URL` when the API runs on Render. Use the database's direct connection URL for `DIRECT_DATABASE_URL`; if the provider does not offer separate pooled and direct URLs, use the same working PostgreSQL URL for both. Do not commit either value or send the password in chat.

Before the API can serve `/api/v1`, the database must be reachable and the Render release command must complete successfully:

```powershell
npm run db:push --workspace server; npm run db:seed --workspace server
```

The seed creates the initial show, ticket categories, add-ons, and timeslots. A failed release or missing `DATABASE_URL` prevents the API service from starting correctly.

## 3. Availability and flash-sale protection

The API runs an expired-hold cleanup every 60 seconds and also cleans up before each new hold. Slot holds use a PostgreSQL transaction advisory lock plus the conditional capacity update below, so concurrent requests for one slot are serialized without requiring Redis.

Recommended hold sequence:

1. Validate the request and calculate the ticket count.
2. Acquire the PostgreSQL transaction advisory lock for the slot.
3. Inside a short PostgreSQL transaction, run the conditional capacity update:

```sql
UPDATE "Slot"
SET "heldCount" = "heldCount" + $1
WHERE "id" = $2
  AND "startsAt" > NOW()
  AND "bookedCount" + "heldCount" + $1 <= "totalCapacity";
```

4. Create the pending booking and ticket rows.
5. Let the transaction release the advisory lock automatically on commit or rollback.
6. On payment success, transfer the ticket count atomically from `heldCount` to `bookedCount`.

Use a short lock TTL so a crashed API process cannot block a slot indefinitely. Do not use a plain `DEL` without token ownership; a delayed request could delete another request's lock.

### PostgreSQL connection pooling

- Use the provider's pooled URL for web traffic.
- Keep Prisma pool size conservative per API replica. If using PgBouncer in transaction mode, follow Prisma's PgBouncer configuration guidance and use the direct URL for migrations.
- Prisma Accelerate is an alternative for managed pooling and read caching; it does not replace the transactional capacity update.
- Start with a small API replica count and measure pool saturation before scaling horizontally.

Redis is not required for the current booking path. If it is introduced later, it must remain a contention reducer rather than the booking source of truth; PostgreSQL capacity checks and transaction locks must remain in place.

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
