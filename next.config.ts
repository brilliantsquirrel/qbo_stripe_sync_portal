import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@google-cloud/tasks",
    "node-quickbooks",
    "intuit-oauth",
  ],
};

export default nextConfig;
