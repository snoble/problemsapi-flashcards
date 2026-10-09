import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared core is TypeScript source in this workspace.
  transpilePackages: ["flashcards-core"],
};

export default nextConfig;
