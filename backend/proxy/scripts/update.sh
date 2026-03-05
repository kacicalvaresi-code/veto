#!/usr/bin/env bash
# =============================================================================
#  Veto Backend — Zero-Downtime Update Script
#
#  Run this on the VPS after pushing new code to GitHub:
#    ssh root@209.74.83.109 "bash /opt/veto/backend/proxy/scripts/update.sh"
#
#  Or from your local machine (requires SSH key auth):
#    ssh root@209.74.83.109 'bash -s' < backend/proxy/scripts/update.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }

REPO_DIR="/opt/veto"

info "Pulling latest code from GitHub..."
git -C "$REPO_DIR" pull --ff-only
success "Code updated."

info "Installing/updating Node.js dependencies..."
cd "$REPO_DIR/backend/proxy"
npm install --omit=dev --quiet
success "Dependencies up to date."

info "Reloading PM2 (zero-downtime)..."
pm2 reload ecosystem.config.js --env production
success "PM2 reloaded."

echo ""
echo -e "${GREEN}✅  Update complete. Running processes:${NC}"
pm2 list
