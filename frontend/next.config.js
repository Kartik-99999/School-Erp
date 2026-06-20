/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle at .next/standalone so the Docker runtime image
  // stays slim (no full node_modules). See frontend/Dockerfile. Behaviour is otherwise
  // unchanged from the previous (config-less) defaults.
  output: "standalone",
};

module.exports = nextConfig;
