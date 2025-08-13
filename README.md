# Talent Bridge API

This project provides an Express-based API with Swagger documentation. It includes a Vercel-compatible Swagger setup that works both locally and in serverless environments, avoiding the common "Unexpected token '<'" Swagger UI error on Vercel.

## Quick Start

- Local API: `http://localhost:4000`
- Swagger UI (local): `http://localhost:4000/docs`
- OpenAPI JSON: `http://localhost:4000/swagger.json`
- Vercel Swagger UI (static): `https://<your-vercel-domain>/swagger.html`

## Swagger on Vercel — Problem and Fix

### The Error
```
Uncaught SyntaxError: Unexpected token '<'
SwaggerUIBundle is not defined
```

### Root Cause
- Vercel cannot serve Swagger UI assets from `node_modules`.
- Swagger UI tries to load JS/CSS from your API route and gets HTML (404), causing the error.

### The Fix
Use a CDN-based Swagger UI and serve your OpenAPI JSON separately:

1. Serve OpenAPI JSON from your API:
   - Code already implemented: `GET /swagger.json`
2. Serve Swagger UI via CDN at `/docs` (server-rendered HTML), or provide a static file:
   - Dynamic (already implemented): `GET /docs`
   - Static alternative: put `public/swagger.html` in your repo (done) pointing to `/swagger.json`.

## Implementation Details

### Server routes
- `GET /swagger.json`: serves the OpenAPI spec.
- `GET /docs`: serves a minimal HTML that loads Swagger UI from CDN and references `/swagger.json`.

Defined in `swagger.js` via `setupSwagger(app)`.

### Static alternative
- `public/swagger.html` uses CDN-hosted Swagger UI and points to `/swagger.json`.
- Works on Vercel and any static host.

## Vercel Configuration
`vercel.json` routes all requests to `src/server.js`. Static files in `/public` are served by Vercel automatically.

## Developing Locally

1. Install dependencies
2. Start the dev server (nodemon)
3. Open docs

## Notes
- Keep `/swagger.json` as the single source of truth.
- Prefer the `/docs` route for local usage; `public/swagger.html` is a fallback static option.

## License
MIT
