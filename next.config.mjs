/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose env vars to the browser bundle.
  // NEXT_PUBLIC_* vars are already auto-exposed by Next.js, but listing them
  // here makes the dependency explicit and allows build-time validation.
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    NEXT_PUBLIC_WS_URL:
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000",
  },
};

export default nextConfig;
