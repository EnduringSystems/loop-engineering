/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    BLACKBOARD_ROOT: process.env.BLACKBOARD_ROOT || "/bb",
  },
};

export default nextConfig;
