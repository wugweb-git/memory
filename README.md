# Minimal Memory Server

Minimal Node.js + Express server with MongoDB collections: `items` and `health_queue`.

## Environment variables

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
PORT=3000
```

## Run

```bash
npm install
npm start
```

## API

- `GET /health`
- `POST /items`
- `GET /items`
- `POST /sync`

### POST /items

```json
{
  "raw": "string",
  "external_id": "optional"
}
```

### POST /sync

```json
{
  "raw": "string",
  "url": "optional",
  "external_id": "optional",
  "platform": "optional"
}
```
