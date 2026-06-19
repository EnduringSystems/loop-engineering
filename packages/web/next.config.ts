import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    BLACKBOARD_ROOT:
      process.env.BLACKBOARD_ROOT || "/bb",
  },
};

export default nextConfig;
