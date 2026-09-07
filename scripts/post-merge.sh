#!/bin/bash
# Post-merge setup for Dyorly (static HTML/CSS/JS + Vercel serverless api/*.ts).
# No build step or database — just sanity-check the frontend JS parses.
set -e

node --check app.js
echo "post-merge setup OK"
