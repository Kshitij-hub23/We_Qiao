/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow dev access to /_next/* assets when served through a Cloudflare tunnel
  // (the tunnel hostname changes each session, so allow the whole domain).
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
