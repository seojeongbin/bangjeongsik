import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.45.152'],
};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
