#!/usr/bin/env bash
# Deploys production and points dslop.vercel.app at it (a .vercel.app alias doesn't follow new deploys by itself).
set -e
cd "$(dirname "$0")"
url=$(vercel deploy --prod --yes 2>/dev/null | grep -o "https://[a-z]*slop-[a-z0-9]*-gumball-s-projects1.vercel.app" | tail -1)
[ -z "$url" ] && url=$(vercel ls --prod 2>/dev/null | grep -o "https://[a-z]*slop-[a-z0-9]*-gumball-s-projects1.vercel.app" | head -1)
vercel alias set "$url" dslop.vercel.app
echo "live: https://dslop.vercel.app -> $url"
