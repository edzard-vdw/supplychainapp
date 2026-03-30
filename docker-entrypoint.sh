#!/bin/sh
set -e

echo "Running Prisma migrations..."
prisma migrate deploy

echo "Starting Next.js..."
exec node server.js
