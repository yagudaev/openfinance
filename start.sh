#!/bin/sh
set -e

echo "Running database migrations..."
NODE_PATH=/app/prisma-cli/node_modules node /app/prisma-cli/node_modules/prisma/build/index.js migrate deploy
echo "Database ready."

exec node server.js
