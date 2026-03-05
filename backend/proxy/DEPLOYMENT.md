# Veto Backend — VPS Deployment Guide

This document covers deploying the Veto backend proxy to the **Spaceship Starlight VPS** (`nan500`, `209.74.83.109`, Ubuntu 24.04) using **Node.js + PM2 + Nginx** — no Docker required.

> **Docker alternative:** A `Dockerfile` is included in this directory if you prefer a containerised deployment. The PM2/Nginx approach below is recommended for the Spaceship VPS because it is simpler to maintain, uses less RAM, and gives you direct access to logs and the spam database files.

---

## Architecture Overview

```
iOS App (Expo)
     │
     │  HTTPS
     ▼
api.vetospam.app  ──►  Nginx (reverse proxy, SSL termination)
                              │
                              │  localhost:3000
                              ▼
                        Node.js (PM2 cluster, 2 workers)
                              │
                        /opt/veto/backend/proxy/
                              ├── server.js          (Express app)
                              ├── routes.js           (API endpoints)
                              ├── spamBuilder.js      (FTC DNC pipeline)
                              ├── ecosystem.config.js (PM2 config)
                              └── data/
                                  ├── spam_list.bin   (sorted binary)
                                  └── spam_meta.json  (ETag metadata)
```

---

## First-Time Setup

### Prerequisites

- SSH access to `root@209.74.83.109`
- The `api` DNS A record pointing to `209.74.83.109` (see Step 2 below)
- Read access to `kacicalvaresi-code/veto` on GitHub

### Step 1 — Run the Setup Script

SSH into the VPS and run the one-shot setup script:

```bash
ssh root@209.74.83.109
bash <(curl -fsSL https://raw.githubusercontent.com/kacicalvaresi-code/veto/main/backend/proxy/scripts/setup-vps.sh)
```

The script will:
1. Install Node.js 22, PM2, Nginx, and Certbot
2. Create the `/opt/veto` directory and a dedicated `veto` system user
3. Clone the GitHub repository
4. Install Node.js dependencies
5. Prompt you for an optional Call Control API key
6. Build the initial spam database from the FTC DNC CSV
7. Install and enable the Nginx configuration
8. Configure the UFW firewall (SSH + HTTP/HTTPS only)
9. Start the Node.js server with PM2
10. Configure PM2 to start automatically on reboot

### Step 2 — Add DNS Record in Spaceship

Log into [spaceship.com](https://spaceship.com) → Domains → `vetospam.app` → DNS Records.

Add the following record:

| Type | Name | Value           | TTL |
| :--- | :--- | :-------------- | :-- |
| A    | api  | 209.74.83.109   | 300 |

DNS propagation typically takes 2–5 minutes with a 300-second TTL.

### Step 3 — Issue the SSL Certificate

Once DNS has propagated, run Certbot on the VPS:

```bash
sudo certbot --nginx -d api.vetospam.app
```

When prompted, choose **option 2** (redirect HTTP to HTTPS). Certbot will automatically update the Nginx configuration and schedule auto-renewal via a systemd timer.

Verify the certificate is working:

```bash
curl https://api.vetospam.app/health
```

You should receive a JSON response like:

```json
{
  "status": "ok",
  "version": "2.0.0",
  "spamListEntries": 847293,
  "lastUpdated": "2026-03-05T02:00:00.000Z"
}
```

### Step 4 — Configure the Expo App

Add the API URL to your Expo environment. For EAS Build, add it as a secret:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_PROXY_URL --value https://api.vetospam.app
```

For local development, add it to `.env.local`:

```
EXPO_PUBLIC_PROXY_URL=https://api.vetospam.app
```

---

## Updating After a Code Push

After pushing changes to GitHub, update the VPS with zero downtime:

```bash
ssh root@209.74.83.109 "bash /opt/veto/backend/proxy/scripts/update.sh"
```

---

## Environment Variables

The `.env` file lives at `/opt/veto/backend/proxy/.env` (permissions `600`, owned by `veto`).

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `3000` | Port the Node.js server listens on |
| `NODE_ENV` | No | `production` | Node environment |
| `ALLOWED_ORIGINS` | No | `https://vetospam.app` | CORS allowed origins |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window per IP |
| `LOG_LEVEL` | No | `info` | Logging verbosity |
| `CALL_CONTROL_API_KEY` | No | — | Optional real-time reputation API |

To edit the `.env` file on the server:

```bash
ssh root@209.74.83.109
nano /opt/veto/backend/proxy/.env
pm2 reload veto-api
```

---

## API Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health, DB entry count, last updated |
| `GET` | `/api/spam-list/meta` | Spam list metadata (ETag, count, timestamp) |
| `GET` | `/api/spam-list/latest.bin` | Binary spam list download (ETag/304 support) |
| `GET` | `/api/reputation/:phone` | Real-time reputation check for a phone number |
| `POST` | `/api/report` | Submit an anonymous community spam report |

---

## Monitoring & Maintenance

```bash
# Live logs
pm2 logs veto-api

# Real-time CPU/RAM monitor
pm2 monit

# Server status
pm2 list
curl https://api.vetospam.app/health

# Manually rebuild the spam database
cd /opt/veto/backend/proxy && sudo -u veto node spamBuilder.js && pm2 reload veto-api

# Nginx logs
tail -f /var/log/nginx/veto-api-access.log
tail -f /var/log/nginx/veto-api-error.log

# SSL renewal test
sudo certbot renew --dry-run
```

---

## File Structure on the VPS

```
/opt/veto/                          ← Git repository root
├── backend/
│   └── proxy/
│       ├── server.js
│       ├── routes.js
│       ├── spamBuilder.js
│       ├── ecosystem.config.js
│       ├── package.json
│       ├── .env                    ← NOT in Git (secrets)
│       ├── data/
│       │   ├── spam_list.bin       ← Generated, NOT in Git
│       │   └── spam_meta.json      ← Generated, NOT in Git
│       ├── nginx/
│       │   └── api.vetospam.app.conf
│       └── scripts/
│           ├── setup-vps.sh
│           └── update.sh
/var/log/veto/
├── api-out.log
└── api-error.log
```

---

## Troubleshooting

| Problem | Solution |
| :--- | :--- |
| Server won't start | `pm2 logs veto-api --lines 50` |
| Nginx 502 Bad Gateway | `pm2 list` then `pm2 restart veto-api` |
| SSL certificate errors | `sudo certbot renew --force-renewal` |
| Spam database empty | `cd /opt/veto/backend/proxy && sudo -u veto node spamBuilder.js` |
