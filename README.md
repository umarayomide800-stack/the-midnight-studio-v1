# The Midnight Studio

A full-stack foundation for The Midnight Studio interactive attraction platform.

## Stack

- `client`: React, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons
- `server`: Node.js, Express, TypeScript, Helmet, CORS
- `shared/types`: Shared TypeScript contracts
- PostgreSQL via Prisma ORM
- Redis reserved for slot locking

## Getting started

```powershell
npm install
Copy-Item server/.env.example server/.env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

The client runs on `http://localhost:5173` and the API runs on `http://localhost:4000`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for production architecture, environment variables, flash-sale protection, and load-testing instructions.

See [RUNNING.md](RUNNING.md) for local setup, development commands, API routes, and production build instructions.

## Availability API

All API responses use a `{ "success": true, "data": ... }` envelope. Validation and server failures use `{ "success": false, "error": { "code": ..., "message": ... } }`.

- `GET /api/v1/shows` returns active shows and advisories.
- `GET /api/v1/shows/:slug/timeslots?date=YYYY-MM-DD` returns slots with `remainingCapacity`.
- `POST /api/v1/bookings/hold-slot` reserves tickets for 10 minutes.
- `POST /api/v1/checkout/create-intent` creates a Stripe PaymentIntent for a valid hold and selected add-ons.
- `POST /api/v1/webhooks/stripe` confirms successful Stripe payments and sends the booking receipt email.

Example hold body:

```json
{
	"slotId": "slot-id",
	"customerName": "Ada Lovelace",
	"customerEmail": "ada@example.com",
	"tickets": [{ "ticketCategoryId": "adult-category-id", "quantity": 2 }]
}
```
