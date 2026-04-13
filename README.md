# Memory System — Phase 1 (Ingestion Engine)

Serverless memory ingestion system for Vercel using MongoDB + Mongoose.

## Structure

- `api/items.js`
- `api/sync.js`
- `api/email.js`
- `api/health.js`
- `lib/db.js`
- `lib/hash.js`
- `models/Item.js`
- `models/Health.js`

## Endpoints

- `GET /api/items` - latest 50 items (history hidden)
- `POST /api/items` - manual ingestion (`{ raw }`)
- `POST /api/sync` - external sync (`raw`, `url`, `external_id`, `platform`)
- `POST /api/email` - email ingestion (`subject`, `body`, `from`)
- `GET /api/health` - items with `sync.link_status = broken`

## Environment

Create `.env`:

```env
MONGO_URI=your_mongo_string
```

## Vercel config

`vercel.json`

```json
{
  "functions": {
    "api/*.js": {
      "maxDuration": 10
    }
  }
}
```
