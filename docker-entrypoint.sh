set -e

export DATABASE_URL="${DATABASE_URL:-file:/data/dev.db}"

prisma db push --skip-generate

exec node server.js