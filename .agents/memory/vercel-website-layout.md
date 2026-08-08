---
name: Vercel website layout
description: Durable deployment convention for the Dyorly repository.
---

Dyorly is deployed as a standalone Vite website from the repository root, not as a workspace package or nested artifact. Vercel builds with `pnpm run build` and serves `dist`.

**Why:** The earlier workspace layout made Vercel install unrelated API, database, mockup, and generated packages, and Replit-only Vite configuration caused deployment failures.

**How to apply:** Keep the website source in `src/`, static assets in `public/`, and root `package.json`, `vite.config.ts`, `tsconfig.json`, and `vercel.json` aligned. Do not restore the removed workspace structure unless the product requirements change.