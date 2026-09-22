# Running The Midnight Studio

## Prerequisites

Install:

- Node.js 20 or newer
- npm
- PostgreSQL for database-backed API features

Optional:

- Redis for production booking locks
- Stripe test keys for checkout testing
- Resend test configuration for receipt emails

## Install dependencies

From the repository root:

```powershell
npm install
```

If Prisma engine downloads are interrupted, install packages first with:

```powershell
npm install --ignore-scripts
npx prisma generate --schema server/prisma/schema.prisma
```

## Configure environment variables

Copy the server template:

```powershell
Copy-Item server/.env.example server/.env
```

Update `server/.env` with your PostgreSQL connection string. The default local value is:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/soma_dungeon?schema=public"
```

For payment testing, also configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, and `EMAIL_FROM`.

## Prepare the database

Generate the Prisma client:

```powershell
npm run db:generate
```

Create or update the local schema:

```powershell
npm run db:push
```

Populate the catalog and timeslots:

```powershell
npm run db:seed
```

The seed creates 3 shows, 5 ticket categories, 3 add-ons, and timeslots for the next 7 days.

## Start development

Run the frontend and API together:

```powershell
npm run dev
```

Open:

- Guest website: http://localhost:5173
- API health check: http://localhost:4000/api/health

The Vite development server proxies `/api` requests to the API on port `4000`.

## Run services separately

Frontend only:

```powershell
npm run dev --workspace client
```

API only:

```powershell
npm run dev --workspace server
```

## Verify the project

Run typechecks:

```powershell
npm run typecheck
```

Build both applications:

```powershell
npm run build
```

Validate the Prisma schema:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/soma_dungeon?schema=public"
npx prisma validate --schema server/prisma/schema.prisma
```

## Main API routes

- `GET /api/v1/shows`
- `GET /api/v1/shows/:slug/timeslots?date=YYYY-MM-DD`
- `POST /api/v1/bookings/hold-slot`
- `POST /api/v1/checkout/create-intent`
- `POST /api/v1/webhooks/stripe`

## Production build

Build the complete project:

```powershell
npm ci
npm run db:generate
npm run build
```

Start the compiled API:

```powershell
node server/dist/index.js
```

Deploy the frontend output from `client/dist`. Configure the hosting provider to serve `client/index.html` for SPA routes.

For production architecture, pooling, Redis locks, and load testing, see [DEPLOYMENT.md](DEPLOYMENT.md).
