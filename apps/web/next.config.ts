import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cognitive-os/db", "@cognitive-os/shared-types"],
};

export default nextConfig;
