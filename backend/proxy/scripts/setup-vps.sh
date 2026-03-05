#!/usr/bin/env bash
# =============================================================================
#  Veto Backend — One-Shot VPS Setup Script
#  Target: Spaceship Starlight VPS (Ubuntu 24.04, 2 vCPUs, 4 GiB RAM)
#  IP:     209.74.83.109
#
#  Run as root (or with sudo) after SSHing into the server:
#    ssh root@209.74.83.109
#    bash <(curl -fsSL https://raw.githubusercontent.com/kacicalvaresi-code/veto/main/backend/proxy/scripts/setup-vps.sh)
#
#  Or upload this file and run:
#    chmod +x setup-vps.sh && sudo bash setup-vps.sh
#
#  What this script does:
#    1. Updates the system and installs Node.js 22, PM2, Nginx, Certbot
#    2. Creates the /opt/veto directory structure and a dedicated system user
#    3. Clones the GitHub repo into /opt/veto
#    4. Installs Node.js dependencies
#    5. Creates the .env file (you will be prompted for optional values)
#    6. Creates the log directory
#    7. Builds the initial spam database from the FTC CSV
#    8. Installs and enables the Nginx config for api.vetospam.app
#    9. Starts the Node.js server with PM2 and saves the process list
#   10. Configures PM2 to start on system boot
#   11. Prints next steps (DNS + Certbot SSL)
# =============================================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Must run as root ──────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Please run this script as root: sudo bash setup-vps.sh"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        Veto Backend — VPS Setup Script v1.0         ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — System update
# ─────────────────────────────────────────────────────────────────────────────
info "Step 1/10 — Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git nginx ufw
success "System packages updated."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Node.js 22 via NodeSource
# ─────────────────────────────────────────────────────────────────────────────
info "Step 2/10 — Installing Node.js 22..."
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 22 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - -qq
    apt-get install -y -qq nodejs
fi
success "Node.js $(node -v) installed."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — PM2 (global)
# ─────────────────────────────────────────────────────────────────────────────
info "Step 3/10 — Installing PM2..."
npm install -g pm2 --quiet
success "PM2 $(pm2 -v) installed."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Certbot
# ─────────────────────────────────────────────────────────────────────────────
info "Step 4/10 — Installing Certbot..."
apt-get install -y -qq certbot python3-certbot-nginx
success "Certbot installed."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — Create directory structure and system user
# ─────────────────────────────────────────────────────────────────────────────
info "Step 5/10 — Creating /opt/veto directory structure..."

# Dedicated non-login system user for the Node process
if ! id -u veto &>/dev/null; then
    useradd --system --no-create-home --shell /usr/sbin/nologin veto
    success "System user 'veto' created."
else
    warn "System user 'veto' already exists — skipping."
fi

mkdir -p /opt/veto
mkdir -p /var/log/veto
chown -R veto:veto /opt/veto /var/log/veto

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — Clone / update the repo
# ─────────────────────────────────────────────────────────────────────────────
info "Step 6/10 — Cloning the Veto repository..."

REPO_DIR="/opt/veto"
REPO_URL="https://github.com/kacicalvaresi-code/veto.git"

if [[ -d "$REPO_DIR/.git" ]]; then
    warn "Repo already cloned — pulling latest changes..."
    git -C "$REPO_DIR" pull --ff-only
else
    git clone "$REPO_URL" "$REPO_DIR"
fi

chown -R veto:veto "$REPO_DIR"
success "Repository ready at $REPO_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 7 — Install Node.js dependencies
# ─────────────────────────────────────────────────────────────────────────────
info "Step 7/10 — Installing Node.js dependencies..."
cd "$REPO_DIR/backend/proxy"
npm install --omit=dev --quiet
success "Dependencies installed."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 8 — Create .env file
# ─────────────────────────────────────────────────────────────────────────────
info "Step 8/10 — Creating .env file..."

ENV_FILE="$REPO_DIR/backend/proxy/.env"

if [[ -f "$ENV_FILE" ]]; then
    warn ".env already exists — skipping creation. Edit $ENV_FILE manually if needed."
else
    echo ""
    echo -e "${YELLOW}Optional: Enter your Call Control API key for real-time reputation checks.${NC}"
    echo -e "${YELLOW}Press Enter to skip (the server works without it).${NC}"
    read -r -p "Call Control API key [leave blank to skip]: " CC_KEY

    cat > "$ENV_FILE" <<EOF
# ─── Veto Backend Proxy v2.0 — Production Environment ────────────────────────
PORT=3000
NODE_ENV=production

# CORS — native mobile apps send no Origin header, so this is for the website
ALLOWED_ORIGINS=https://vetospam.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
EOF

    if [[ -n "$CC_KEY" ]]; then
        echo "" >> "$ENV_FILE"
        echo "# Call Control API (real-time reputation)" >> "$ENV_FILE"
        echo "CALL_CONTROL_API_KEY=$CC_KEY" >> "$ENV_FILE"
    fi

    chown veto:veto "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    success ".env file created at $ENV_FILE"
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 9 — Build initial spam database
# ─────────────────────────────────────────────────────────────────────────────
info "Step 9/10 — Building initial spam database from FTC DNC data..."
info "This downloads the FTC CSV and may take 30–60 seconds..."

mkdir -p "$REPO_DIR/backend/proxy/data"
chown -R veto:veto "$REPO_DIR/backend/proxy/data"

# Run as the veto user to ensure correct file ownership
sudo -u veto node "$REPO_DIR/backend/proxy/spamBuilder.js" || {
    warn "Spam database build encountered an issue. The server will retry on first boot."
    warn "Check /var/log/veto/api-error.log after starting the server."
}

success "Spam database build complete."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 10 — Nginx configuration
# ─────────────────────────────────────────────────────────────────────────────
info "Step 10/10 — Installing Nginx configuration..."

NGINX_CONF_SRC="$REPO_DIR/backend/proxy/nginx/api.vetospam.app.conf"
NGINX_CONF_DST="/etc/nginx/sites-available/api.vetospam.app"
NGINX_ENABLED="/etc/nginx/sites-enabled/api.vetospam.app"

cp "$NGINX_CONF_SRC" "$NGINX_CONF_DST"

# Remove the default Nginx site to avoid conflicts
rm -f /etc/nginx/sites-enabled/default

# Enable the Veto API site
if [[ ! -L "$NGINX_ENABLED" ]]; then
    ln -s "$NGINX_CONF_DST" "$NGINX_ENABLED"
fi

# Test the config before reloading
nginx -t && systemctl reload nginx
success "Nginx configured and reloaded."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 11 — Firewall
# ─────────────────────────────────────────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
success "Firewall configured: SSH + HTTP/HTTPS allowed."

# ─────────────────────────────────────────────────────────────────────────────
# STEP 12 — Start with PM2
# ─────────────────────────────────────────────────────────────────────────────
info "Starting Veto API with PM2..."

cd "$REPO_DIR/backend/proxy"

# Stop any existing instance cleanly
pm2 delete veto-api 2>/dev/null || true

# Start using the ecosystem config
pm2 start ecosystem.config.js --env production

# Save the process list so PM2 restores it after a reboot
pm2 save

# Generate and install the systemd startup script
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

success "PM2 started and configured to survive reboots."

# ─────────────────────────────────────────────────────────────────────────────
# Done — print next steps
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║            ✅  Setup Complete!                           ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Server status:${NC}"
pm2 list
echo ""
echo -e "${BOLD}Health check (should return JSON):${NC}"
curl -s http://127.0.0.1:3000/health | python3 -m json.tool 2>/dev/null || \
    curl -s http://127.0.0.1:3000/health
echo ""
echo -e "${YELLOW}${BOLD}━━━ NEXT STEPS (manual) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BOLD}1. Add a DNS A record in Spaceship:${NC}"
echo "   Name:  api"
echo "   Type:  A"
echo "   Value: 209.74.83.109"
echo "   TTL:   300"
echo ""
echo -e "${BOLD}2. Once DNS propagates (~5 min), run Certbot for free SSL:${NC}"
echo "   sudo certbot --nginx -d api.vetospam.app"
echo "   (Follow the prompts — choose option 2 to redirect HTTP→HTTPS)"
echo ""
echo -e "${BOLD}3. Set your Expo environment variable:${NC}"
echo "   EXPO_PUBLIC_PROXY_URL=https://api.vetospam.app"
echo "   (Add to your EAS secret or .env.local for local dev)"
echo ""
echo -e "${BOLD}4. Verify the live API:${NC}"
echo "   curl https://api.vetospam.app/health"
echo ""
echo -e "${BOLD}Useful PM2 commands:${NC}"
echo "   pm2 logs veto-api          # live log stream"
echo "   pm2 monit                  # real-time CPU/RAM monitor"
echo "   pm2 reload veto-api        # zero-downtime reload after code changes"
echo "   pm2 restart veto-api       # hard restart"
echo ""
echo -e "${BOLD}To update the app after a GitHub push:${NC}"
echo "   cd /opt/veto && git pull && cd backend/proxy && npm install --omit=dev && pm2 reload veto-api"
echo ""
