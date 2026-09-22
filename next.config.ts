import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The lot is /marketplace now — the word a buyer already knows from
      // Facebook. The old paths were public, are in people's history and in at
      // least one ad creative, so they land on the new page rather than a 404.
      // Both the bare and the localised forms are covered: middleware adds the
      // locale after these run, so a bare /cars would otherwise become /es/cars
      // and only then miss.
      { source: "/cars", destination: "/marketplace", permanent: true },
      { source: "/cars/:id", destination: "/marketplace/:id", permanent: true },
      {
        source: "/:locale(es|en)/cars",
        destination: "/:locale/marketplace",
        permanent: true,
      },
      {
        source: "/:locale(es|en)/cars/:id",
        destination: "/:locale/marketplace/:id",
        permanent: true,
      },
      // The auction product is gone: there is no Monday drop, no bidding, and
      // no membership.
      { source: "/drop", destination: "/marketplace", permanent: true },
    ];
  },
};

export default nextConfig;
