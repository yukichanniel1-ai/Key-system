# 🔑 KeyVault — API Key Management System

A full-stack key management system built with **Next.js** + **Vercel KV (Redis)**. Deploy in minutes.

---

## Features

- ✦ Generate keys in 4 formats: UUID v4, HEX-32, ALPHANUM-24, PREFIX-KEY
- ✦ 4 tiers: Free, Pro, Enterprise, Admin
- ✦ Configurable expiry (7 days → never) and rate limits
- ✦ Validate keys via API or dashboard
- ✦ Revoke & delete keys
- ✦ Usage tracking per key
- ✦ Persistent storage via Vercel KV (Redis)
- ✦ Admin secret protection

---

## Deploy to Vercel (5 minutes)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "init key system"
gh repo create key-system --public --push
```

### 2. Import to Vercel

Go to [vercel.com/new](https://vercel.com/new) → Import your repo → Deploy.

### 3. Add Vercel KV Storage

In your Vercel dashboard:
1. Go to your project → **Storage** tab
2. Click **Create Database** → select **KV**
3. Name it `keyvault` → Create
4. Click **Connect to Project** — env vars are added automatically

### 4. Set Environment Variables

In Vercel → Project Settings → Environment Variables, add:

```
ADMIN_SECRET=your_strong_secret_here
NEXT_PUBLIC_ADMIN_SECRET=your_strong_secret_here
```

> ⚠️ `NEXT_PUBLIC_ADMIN_SECRET` is used by the frontend. For production, build a proper login page instead.

### 5. Redeploy

Go to Deployments → click the three dots on the latest → **Redeploy**.

---

## API Reference

All admin routes require the header: `x-admin-secret: <your secret>`

### Generate a Key
```http
POST /api/keys/generate
Content-Type: application/json
x-admin-secret: your_secret

{
  "label": "my-app",
  "tier": "pro",
  "format": "uuid",
  "expiryDays": 30,
  "rateLimit": "1000"
}
```

**Response:**
```json
{
  "id": "uuid",
  "key": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
  "label": "my-app",
  "tier": "pro",
  "rateLimit": "1000",
  "createdAt": 1700000000000,
  "expiresAt": 1702592000000,
  "revoked": false,
  "usageCount": 0
}
```

---

### Validate a Key
```http
POST /api/keys/validate
Content-Type: application/json

{ "key": "your-key-here" }
```

**Response (valid):**
```json
{
  "valid": true,
  "key": { "id": "...", "label": "...", "tier": "pro", ... }
}
```

**Response (invalid):**
```json
{ "valid": false, "reason": "Key has been revoked" }
```

---

### List All Keys
```http
GET /api/keys/list
x-admin-secret: your_secret
```

---

### Revoke a Key
```http
POST /api/keys/revoke
Content-Type: application/json
x-admin-secret: your_secret

{ "id": "key-id-here" }
```

---

### Delete a Key
```http
DELETE /api/keys/delete
Content-Type: application/json
x-admin-secret: your_secret

{ "id": "key-id-here" }
```

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Fill in your KV credentials from Vercel dashboard
# Or leave blank to use in-memory storage (data resets on restart)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Protect Your App with Keys

Use the validate endpoint as middleware in your own API:

```typescript
// pages/api/your-protected-route.ts
export default async function handler(req, res) {
  const userKey = req.headers['x-api-key']
  
  const check = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/keys/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: userKey })
  })
  
  const { valid, reason } = await check.json()
  if (!valid) return res.status(401).json({ error: reason })
  
  // Your protected logic here
  res.json({ data: 'secret stuff' })
}
```

---

## Tech Stack

- **Next.js 14** — framework
- **Vercel KV** — Redis-backed persistent storage  
- **TypeScript** — type safety
- **uuid** — key generation

---

## File Structure

```
key-system/
├── pages/
│   ├── index.tsx              # Dashboard UI
│   ├── _app.tsx
│   └── api/keys/
│       ├── generate.ts        # POST /api/keys/generate
│       ├── list.ts            # GET  /api/keys/list
│       ├── validate.ts        # POST /api/keys/validate
│       ├── revoke.ts          # POST /api/keys/revoke
│       └── delete.ts          # DELETE /api/keys/delete
├── lib/
│   ├── types.ts               # TypeScript interfaces
│   ├── keygen.ts              # Key generation logic
│   └── store.ts               # KV storage abstraction
├── .env.example
├── next.config.js
├── package.json
└── README.md
```
