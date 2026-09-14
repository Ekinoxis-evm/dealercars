import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The auction product is gone: there is no Monday drop, no bidding, and
      // no membership. These paths were public and are in people's history and
      // in at least one ad creative, so they land on the lot rather than a 404.
      { source: "/drop", destination: "/cars", permanent: true },
    ];
  },
};

export default nextConfig;
