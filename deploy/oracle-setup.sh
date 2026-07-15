#!/usr/bin/env bash
# =============================================================================
# DarkTalk - Oracle Cloud / Debian/Ubuntu VM Setup Script
# Run once on a fresh VM to set up Postgres, Redis, Node.js, PM2, Nginx.
#
# Usage:
#   1. SSH into VM: ssh ubuntu@<your_vm_ip>
#   2. wget https://raw.githubusercontent.com/.../deploy/oracle-setup.sh
#   3. bash oracle-setup.sh
#
# Idempotent: safe to re-run.
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERR]${NC} $*"; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Run as root: sudo bash $0"

APP_USER="${APP_USER:-darktalk}"
APP_DIR="/home/${APP_USER}/app"
LOG_DIR="/home/${APP_USER}/logs"

# ---------------------------------------------------------------------------
# 1. System updates + basic packages
# ---------------------------------------------------------------------------
log "Step 1: Updating system..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    wget \
    git \
    nginx \
    postgresql \
    postgresql-client \
    redis-server \
    ufw \
    fail2ban \
    certbot \
    python3-certbot-nginx \
    unzip

# ---------------------------------------------------------------------------
# 2. Create app user (if not exists)
# ---------------------------------------------------------------------------
log "Step 2: Creating app user..."
if ! id "${APP_USER}" &>/dev/null; then
    useradd -m -s /bin/bash "${APP_USER}"
fi
mkdir -p "${APP_DIR}" "${LOG_DIR}"
chown -R "${APP_USER}:${APP_USER}" "/home/${APP_USER}"

# ---------------------------------------------------------------------------
# 3. Install Node.js 20 (via NodeSource)
# ---------------------------------------------------------------------------
log "Step 3: Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
node --version
npm --version

# Install PM2 globally
npm install -g pm2

# ---------------------------------------------------------------------------
# 4. Configure PostgreSQL
# ---------------------------------------------------------------------------
log "Step 4: Configuring PostgreSQL..."
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
PG_CONF="/etc/postgresql/16/main/postgresql.conf"

# Ensure service is enabled and started
systemctl enable postgresql
systemctl start postgresql

# Create app database + user (idempotent)
sudo -u postgres psql <<EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'darktalk') THEN
        CREATE USER darktalk WITH PASSWORD 'CHANGE_ME_darktalk_db_password';
    END IF;
END
\$\$;

SELECT 'CREATE DATABASE darktalk OWNER darktalk'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'darktalk')\gexec

GRANT ALL PRIVILEGES ON DATABASE darktalk TO darktalk;
ALTER USER darktalk CREATEDB;
\q
EOF

# Configure pg_hba.conf to allow local password auth
if ! grep -q "host all darktalk 127.0.0.1/32 md5" "${PG_HBA}"; then
    echo "host all darktalk 127.0.0.1/32 md5" >> "${PG_HBA}"
    log "Added pg_hba.conf entry"
fi

# Configure postgresql.conf for decent defaults
sed -i "s/^#max_connections = .*/max_connections = 100/" "${PG_CONF}"
sed -i "s/^#shared_buffers = .*/shared_buffers = 256MB/" "${PG_CONF}"
systemctl restart postgresql

# ---------------------------------------------------------------------------
# 5. Configure Redis
# ---------------------------------------------------------------------------
log "Step 5: Configuring Redis..."
REDIS_CONF="/etc/redis/redis.conf"
sed -i 's/^# requirepass .*/requirepass CHANGE_ME_redis_password/' "${REDIS_CONF}"
sed -i 's/^bind 127.0.0.1.*/bind 127.0.0.1/' "${REDIS_CONF}"
sed -i 's/^protected-mode no/protected-mode yes/' "${REDIS_CONF}"

# Add maxmemory policy for caching
if ! grep -q "^maxmemory-policy" "${REDIS_CONF}"; then
    echo "maxmemory-policy allkeys-lru" >> "${REDIS_CONF}"
fi

systemctl enable redis-server
systemctl restart redis-server

# ---------------------------------------------------------------------------
# 6. Firewall (UFW) + fail2ban
# ---------------------------------------------------------------------------
log "Step 6: Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
# ufw allow 3000  # Don't expose Node.js directly
echo "y" | ufw enable

systemctl enable fail2ban
systemctl start fail2ban

# ---------------------------------------------------------------------------
# 7. Setup app directory (clone from git)
# ---------------------------------------------------------------------------
log "Step 7: Setting up app..."
if [ ! -d "${APP_DIR}/.git" ]; then
    su - "${APP_USER}" -c "
        cd /home/${APP_USER}
        git clone https://github.com/YOUR_USERNAME/darktalk.git app || { echo 'Clone failed - set up manually'; exit 0; }
    "
fi

# Ensure permissions
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# ---------------------------------------------------------------------------
# 8. Print summary
# ---------------------------------------------------------------------------
log "===================================================="
log "  Setup complete!"
log "===================================================="
log ""
log "Next steps (manual):"
log "  1. Edit PostgreSQL password:"
log "       sudo -u postgres psql -c \"ALTER USER darktalk WITH PASSWORD 'YOUR_PASSWORD';\""
log ""
log "  2. Edit Redis password:"
log "       sudo vim /etc/redis/redis.conf  (requirepass line)"
log ""
log "  3. Create .env file:"
log "       cd ${APP_DIR} && cp .env.example .env"
log "       vim .env  (fill DATABASE_URL, REDIS_URL, R2_*, etc.)"
log ""
log "  4. Install Node deps + generate Prisma + build:"
log "       cd ${APP_DIR}"
log "       npm ci --omit=dev"
log "       npx prisma generate"
log "       npx prisma migrate deploy"
log "       npm run build"
log ""
log "  5. Start app:"
log "       pm2 start ecosystem.config.js"
log "       pm2 save"
log "       pm2 startup"
log ""
log "  6. Setup Nginx:"
log "       sudo cp ${APP_DIR}/nginx-darktalk.conf /etc/nginx/sites-available/darktalk"
log "       sudo ln -sf /etc/nginx/sites-available/darktalk /etc/nginx/sites-enabled/darktalk"
log "       sudo rm -f /etc/nginx/sites-enabled/default"
log "       sudo nginx -t && sudo systemctl reload nginx"
log ""
log "  7. Setup SSL with Let's Encrypt:"
log "       sudo certbot --nginx -d YOUR_DOMAIN"
log "===================================================="
