# Memory System — Single Function API

## Default admin credentials

- Email: `admin@wugweb.com`
- Password: `WugWeb123`

## Environment variables

Required:
- `AUTH_SECRET`
- one of: `MONGO_URI` or `MONGODB_URI` or `STORAGE_URL`

Optional:
- `DB_PASSWORD` (used to replace `<db_password>` token in URI)
- `MONGO_URI_FALLBACK` (direct mongodb:// fallback if SRV DNS fails)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## API routes

- `GET /api`
- `GET /api/test`
- `GET /api/test-db`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/items`
- `POST /api/items`
- `DELETE /api/items`
- `POST /api/sync`
- `POST /api/email`
- `GET /api/health`

## Checks

```bash
npm run audit
MONGO_URI="<uri>" AUTH_SECRET="<secret>" npm run test:e2e
```

You can also use:

```bash
MONGODB_URI="<uri>" AUTH_SECRET="<secret>" npm run test:e2e
```


Atlas URI format: `mongodb+srv://memory:<db_password>@cluster0.rxieedq.mongodb.net/?appName=Cluster0` (replace `<db_password>` with your actual password).


If your Atlas password is `wugweb`, you can set `DB_PASSWORD=wugweb` and keep `MONGO_URI` with `<db_password>`.

## Vercel database pool

`lib/db.js` now calls `attachDatabasePool(...)` with the active Mongo client so pooled connections are managed correctly across function suspend/resume.  
There is also `lib/mongodb.ts` containing the direct `MongoClient` + `attachDatabasePool` pattern.

Mongo client options are set to:
- `appName: "devrel.vercel.integration"`
- `maxIdleTimeMS: 5000`

Prisma Mongo datasource is available at `prisma/schema.prisma` and reads `MONGODB_URI`.
