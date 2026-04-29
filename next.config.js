/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  /** Older clients / bookmarks used `/api/ai/insights`; canonical handler is `/api/insights`. */
  async rewrites() {
    return [
      { source: "/api/ai/insights", destination: "/api/insights" },
      { source: "/api/ai/insights/", destination: "/api/insights/" },
    ];
  },
};

module.exports = nextConfig;
