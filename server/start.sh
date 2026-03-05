#!/bin/sh
echo "Pushing database schema..."
npx prisma db push --accept-data-loss
echo "Seeding database..."
node prisma/seed.js || echo "Seed skipped (may already exist)"
echo "Starting server..."
node src/app.js
