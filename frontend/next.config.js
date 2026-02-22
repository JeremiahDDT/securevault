/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const isDev = process.env.NODE_ENV === "development";

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            // Dev: looser CSP so Next.js hot reloading and React DevTools work
            // Production: strict CSP with no unsafe directives
            value: isDev
              ? [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data:",
                  "connect-src 'self' ws://localhost:* http://localhost:3001",
                  "font-src 'self'",
                  "object-src 'none'",
                ].join("; ")
              : [
                  "default-src 'self'",
                  "script-src 'self'",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data:",
                  "connect-src 'self'",
                  "font-src 'self'",
                  "object-src 'none'",
                  "frame-src 'none'",
                ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;