# Memory System — Single Function API

## Default admin credentials

- Email: `admin@wugweb.com`
- Password: `WugWeb123@`

These can be overridden with `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables.

## Environment variables

Required:
- `MONGO_URI`
- `AUTH_SECRET`

Optional:
- `NODE_ENV`
- `ALLOWED_ORIGINS`
- `REQUEST_LIMIT_BYTES`
- `UPLOAD_DIR`
- `JOB_SECRET`
- `APP_VERSION`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## API routes (single Vercel function)

- `GET /api`
- `GET /api/test`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/items`
- `POST /api/items`
- `POST /api/sync`
- `POST /api/email`
- `GET /api/health`
