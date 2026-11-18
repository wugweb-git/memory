# Deployment
Vercel-hosted Next.js with Prisma generation in build. A single Neon/Postgres database via env config (`brain_POSTGRES_PRISMA_URL`, `brain_POSTGRES_URL_NON_POOLING`). Production is manual-promote on Vercel Hobby; Vercel crons are daily and the 5-minute memory pipeline runs from GitHub Actions.
