#!/bin/bash
# Dijalankan di server (VM) oleh GitHub Actions lewat SSH, tiap ada push ke branch `main`.
# Urutan sengaja: build dulu, baru restart PM2 — kalau build gagal, script berhenti (set -e)
# dan versi lama yang masih dipegang PM2 tetap jalan, gak ada downtime karena rilis gagal.
set -e

echo "==> git pull"
git pull origin main

echo "==> npm ci"
npm ci

echo "==> prisma generate"
npx prisma generate

echo "==> prisma migrate deploy"
npx prisma migrate deploy

echo "==> build"
npm run build

echo "==> restart PM2"
pm2 restart selaras-ajar

echo "==> done"
