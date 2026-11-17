import type { NextConfig } from "next";
import path from "node:path";

/** Turbopack sonst oft ~/package-lock.json als Root — dann laden Chunks/HMR nicht zuverlässig. */
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    // Verhindert SST-/Compaction-Fehler („Persisting failed“, „Compaction failed“), wenn der
    // Dev-Cache korrupt ist, iCloud/Desktop sync greift oder zwei `next dev` laufen.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
