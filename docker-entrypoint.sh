#!/bin/sh
set -e

# Default SQLite path inside the container (mount a volume on /data for persistence)
export DATABASE_URL="${DATABASE_URL:-file:/data/dev.db}"

# Apply schema to the SQLite file (creates /data/dev.db on first run if writable)
prisma db push --schema=./prisma/schema.prisma --skip-generate

exec node server.js
