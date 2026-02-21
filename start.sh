#!/bin/sh
set -e

echo "Running database migrations..."
node /app/prisma-cli/node_modules/prisma/build/index.js db push --skip-generate
echo "Database ready."

exec node server.js
