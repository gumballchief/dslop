import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // the serverless Chrome that reads pages the way a person sees them (lib/render.ts) ships its compressed browser
  // as data files, which the tracer can miss: include them with the route that uses it
  outputFileTracingIncludes: {
    "/api/analyze": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/health": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/directions": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/polish": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
