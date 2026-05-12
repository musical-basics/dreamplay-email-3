/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // The hosted email-attribution beacon (public/track-attribution.js).
        // Short cache so updates propagate to all consuming landing pages
        // within ~5 minutes without rebuilding any of them. Permissive CORS
        // so any landing page can <script src> this.
        source: "/track-attribution.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, s-maxage=300, must-revalidate",
          },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
