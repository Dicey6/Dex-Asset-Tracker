---
name: Vercel serverless testing
description: How this Vercel-only Vite app should be validated locally.
---

The production API lives in the root `api/` serverless handlers; the local Vite preview is only the frontend and must not grow a development API bridge.

**Why:** The project is hosted on Vercel, where `/api` functions are routed by the platform. A local middleware bridge can mask rewrite or function issues and create a behavior that does not exist in production.

**How to apply:** Validate frontend builds with Vite, and test API handlers directly with a TypeScript/ESM harness or against the deployed Vercel URL. Keep `vercel.json` responsible for SPA fallback routing.