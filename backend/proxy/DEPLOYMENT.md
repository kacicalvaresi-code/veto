## Veto Backend Proxy - Deployment Guide

This guide provides instructions for deploying the Veto backend proxy server to a production environment using Docker.

### Prerequisites

- Docker installed on your server (VPS, cloud instance, etc.)
- A registered domain name (e.g., `api.veto.app`)
- A Call Control API key (sign up at https://www.callcontrol.com/developers/)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/kacicalvaresi-code/veto.git
cd veto/backend/proxy
```

---

### Step 2: Configure Environment Variables

Create a `.env` file in the `backend/proxy` directory:

```bash
cp .env.example .env
```

Then, edit the `.env` file with your production values:

```ini
# Veto Backend Proxy - Environment Configuration

# Server Configuration
PORT=3000
NODE_ENV=production

# Call Control API Configuration
CALL_CONTROL_API_KEY=your_call_control_api_key_here

# CORS Configuration (Your App's URL)
ALLOWED_ORIGINS=https://veto.app

# Rate Limiting (Defaults are fine)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

---

### Step 3: Build the Docker Image

```bash
docker build -t veto-proxy:latest .
```

---

### Step 4: Run the Docker Container

```bash
docker run -d \
  --name veto-proxy \
  --restart always \
  -p 3000:3000 \
  --env-file .env \
  veto-proxy:latest
```

**Explanation:**
- `-d`: Run in detached mode (background)
- `--name veto-proxy`: Assign a name to the container
- `--restart always`: Automatically restart if it crashes
- `-p 3000:3000`: Map port 3000 on the host to port 3000 in the container
- `--env-file .env`: Load environment variables from your `.env` file

---

### Step 5: Verify Deployment

Check the container logs:

```bash
docker logs veto-proxy
```

You should see:
```
🚀 Veto Proxy Server running on port 3000
📝 Environment: production
🔒 CORS enabled for: https://veto.app
```

Test the health check endpoint:

```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "environment": "production"
}
```

---

### Step 6: Configure Reverse Proxy (Recommended)

For production, you should use a reverse proxy like Nginx or Caddy to handle SSL termination and domain mapping.

**Example Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name api.veto.app;

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name api.veto.app;

    ssl_certificate /path/to/your/fullchain.pem;
    ssl_certificate_key /path/to/your/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### Updating the Deployment

To update the server with new code:

```bash
# 1. Pull the latest code
git pull origin main

# 2. Stop and remove the old container
docker stop veto-proxy
docker rm veto-proxy

# 3. Rebuild the image
docker build -t veto-proxy:latest .

# 4. Run the new container
docker run -d --name veto-proxy --restart always -p 3000:3000 --env-file .env veto-proxy:latest
```
