import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets your phone (same Wi-Fi) load the dev server by the laptop's LAN IP.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default nextConfig;
