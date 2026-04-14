# Memory System — Single Function API

## Default admin credentials

- Email: `admin@wugweb.com`
- Password: `WugWeb123`

## Environment variables

Required:
- `MONGO_URI`
- `AUTH_SECRET`

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


Atlas URI format: `mongodb+srv://memory:<db_password>@cluster0.rxieedq.mongodb.net/?appName=Cluster0` (replace `<db_password>` with your actual password).


If your Atlas password is `wugweb`, you can set `DB_PASSWORD=wugweb` and keep `MONGO_URI` with `<db_password>`.
