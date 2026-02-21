#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --skip-generate
echo "Database ready."

exec node server.js
