#!/bin/sh
echo "Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss
echo "Seeding database..."
node prisma/seed.js 2>/dev/null || echo "Seed skipped (may already exist)"
echo "Starting server..."
node src/app.js
