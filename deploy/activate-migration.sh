#!/usr/bin/env bash
# =============================================================================
# DarkTalk - Activate migrated code on production VM
# Run this AFTER code is pushed to git and you want to activate the
# Postgres + R2 storage layers.
#
# This script:
#   1. Backs up old in-memory implementations
#   2. Activates new Prisma/R2 implementations by renaming files
#   3. Updates package.json with new dependencies
#   4. Runs migrations
#   5. Restarts the app
#
# Usage: bash deploy/activate-migration.sh
# =============================================================================

set -euo pipefail

cd "$(dirname "$0")/.."

APP_DIR="$(pwd)"
BACKUP_DIR="${APP_DIR}/.migration-backup-$(date +%Y%m%d_%H%M%S)"

echo "[migration] Activating Postgres + R2 migration..."
echo "[migration] Backup directory: ${BACKUP_DIR}"

mkdir -p "${BACKUP_DIR}"

# 1. Backup old files
echo "[migration] Backing up old implementations..."
cp "${APP_DIR}/src/lib/auth.ts" "${BACKUP_DIR}/"
cp "${APP_DIR}/src/lib/messages.ts" "${BACKUP_DIR}/"
cp "${APP_DIR}/src/lib/storage.ts" "${BACKUP_DIR}/"
cp "${APP_DIR}/src/lib/storage-local.ts" "${BACKUP_DIR}/" 2>/dev/null || true
cp "${APP_DIR}/src/lib/rateLimit.ts" "${BACKUP_DIR}/" 2>/dev/null || true
cp "${APP_DIR}/src/services/invite.service.ts" "${BACKUP_DIR}/"
cp "${APP_DIR}/prisma/schema.prisma" "${BACKUP_DIR}/"
cp "${APP_DIR}/package.json" "${BACKUP_DIR}/"
cp "${APP_DIR}/Dockerfile" "${BACKUP_DIR}/" 2>/dev/null || true
cp "${APP_DIR}/docker-compose.yml" "${BACKUP_DIR}/" 2>/dev/null || true

# 2. Activate new files
echo "[migration] Activating new files..."

# Prisma schema
mv "${APP_DIR}/prisma/schema.prisma" "${APP_DIR}/prisma/schema.prisma.sqlite"
mv "${APP_DIR}/prisma/schema.prisma.postgres" "${APP_DIR}/prisma/schema.prisma"

# lib/auth.ts
mv "${APP_DIR}/src/lib/auth.ts" "${APP_DIR}/src/lib/auth.ts.old"
mv "${APP_DIR}/src/lib/auth.prisma.ts" "${APP_DIR}/src/lib/auth.ts"

# lib/messages.ts
mv "${APP_DIR}/src/lib/messages.ts" "${APP_DIR}/src/lib/messages.ts.old"
mv "${APP_DIR}/src/lib/messages.prisma.ts" "${APP_DIR}/src/lib/messages.ts"

# lib/storage.ts (MinIO → R2)
mv "${APP_DIR}/src/lib/storage.ts" "${APP_DIR}/src/lib/storage.ts.minio"
mv "${APP_DIR}/src/lib/storage-r2.ts" "${APP_DIR}/src/lib/storage.ts"

# lib/storage-local.ts (FS → R2 server-side)
mv "${APP_DIR}/src/lib/storage-local.ts" "${APP_DIR}/src/lib/storage-local.ts.old"
mv "${APP_DIR}/src/lib/storage-r2-service.ts" "${APP_DIR}/src/lib/storage-r2-service.ts"

# rate limit
mv "${APP_DIR}/src/lib/rateLimit.ts" "${APP_DIR}/src/lib/rateLimit.ts.old"
mv "${APP_DIR}/src/lib/rateLimit.redis.ts" "${APP_DIR}/src/lib/rateLimit.ts"

# invite.service
mv "${APP_DIR}/src/services/invite.service.ts" "${APP_DIR}/src/services/invite.service.ts.old"
mv "${APP_DIR}/src/services/invite.service.prisma.ts" "${APP_DIR}/src/services/invite.service.ts"

# env
[ -f "${APP_DIR}/.env.example.v2" ] && mv "${APP_DIR}/.env.example.v2" "${APP_DIR}/.env.example"

# Dockerfile
[ -f "${APP_DIR}/Dockerfile.v2" ] && mv "${APP_DIR}/Dockerfile.v2" "${APP_DIR}/Dockerfile"

# next.config
[ -f "${APP_DIR}/next.config.v2.js" ] && mv "${APP_DIR}/next.config.v2.js" "${APP_DIR}/next.config.js"

# 3. Update package.json (add @aws-sdk packages, remove minio)
echo "[migration] Updating package.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('${APP_DIR}/package.json', 'utf8'));

// Remove minio
delete pkg.dependencies.minio;

// Add AWS SDK v3
pkg.dependencies['@aws-sdk/client-s3'] = '^3.682.0';
pkg.dependencies['@aws-sdk/s3-request-presigner'] = '^3.682.0';

// Standalone build script
if (!pkg.scripts.start.includes('standalone')) {
  pkg.scripts.start = 'node server.js';
}

fs.writeFileSync('${APP_DIR}/package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('package.json updated');
"

# 4. Install + generate + migrate
echo "[migration] Installing new dependencies..."
npm install --omit=dev

echo "[migration] Generating Prisma client..."
npx prisma generate

echo "[migration] Running migrations..."
npx prisma migrate deploy

# 5. Build
echo "[migration] Building Next.js..."
npm run build

# 6. Restart with PM2
echo "[migration] Restarting app via PM2..."
if command -v pm2 &> /dev/null; then
    pm2 restart darktalk || pm2 start ecosystem.config.js
    pm2 save
else
    echo "[migration] PM2 not installed. Skipping restart. Run manually: pm2 start ecosystem.config.js"
fi

echo ""
echo "======================================================="
echo "[migration] ✅ Migration complete!"
echo "======================================================="
echo ""
echo "Old files backed up to: ${BACKUP_DIR}"
echo "If something went wrong, restore with:"
echo "  bash ${BACKUP_DIR}/restore.sh"
echo ""

# Generate restore script
cat > "${BACKUP_DIR}/restore.sh" <<EOF
#!/usr/bin/env bash
# Restore old files
cd "${APP_DIR}"
[ -f "${BACKUP_DIR}/auth.ts" ] && cp "${BACKUP_DIR}/auth.ts" "src/lib/auth.ts"
[ -f "${BACKUP_DIR}/messages.ts" ] && cp "${BACKUP_DIR}/messages.ts" "src/lib/messages.ts"
[ -f "${BACKUP_DIR}/storage.ts" ] && cp "${BACKUP_DIR}/storage.ts" "src/lib/storage.ts"
[ -f "${BACKUP_DIR}/storage-local.ts" ] && cp "${BACKUP_DIR}/storage-local.ts" "src/lib/storage-local.ts"
[ -f "${BACKUP_DIR}/rateLimit.ts" ] && cp "${BACKUP_DIR}/rateLimit.ts" "src/lib/rateLimit.ts"
[ -f "${BACKUP_DIR}/invite.service.ts" ] && cp "${BACKUP_DIR}/invite.service.ts" "src/services/invite.service.ts"
[ -f "${BACKUP_DIR}/schema.prisma" ] && cp "${BACKUP_DIR}/schema.prisma" "prisma/schema.prisma"
[ -f "${BACKUP_DIR}/package.json" ] && cp "${BACKUP_DIR}/package.json" "package.json"
[ -f "${BACKUP_DIR}/Dockerfile" ] && cp "${BACKUP_DIR}/Dockerfile" "Dockerfile"
[ -f "${BACKUP_DIR}/docker-compose.yml" ] && cp "${BACKUP_DIR}/docker-compose.yml" "docker-compose.yml"

npm install
npx prisma generate
npm run build

if command -v pm2 &> /dev/null; then
    pm2 restart darktalk
fi

echo "Restore complete!"
EOF

chmod +x "${BACKUP_DIR}/restore.sh"
