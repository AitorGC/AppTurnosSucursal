#!/bin/sh
set -e

echo "Running prisma migrations..."
npx prisma migrate deploy

echo "Starting backend..."
npm run start
