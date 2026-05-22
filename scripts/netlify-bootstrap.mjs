#!/usr/bin/env node
/**
 * One-time: create a Netlify site and link this folder.
 * Requires: NETLIFY_AUTH_TOKEN in environment (from https://app.netlify.com/user/applications)
 *
 * Usage:
 *   cd kya-demo
 *   export NETLIFY_AUTH_TOKEN=nfp_...
 *   npm run netlify:bootstrap
 */
import { execSync } from "node:child_process";

const siteName = process.env.NETLIFY_SITE_NAME ?? "kya-demo-sandbox";

if (!process.env.NETLIFY_AUTH_TOKEN) {
  console.error("Set NETLIFY_AUTH_TOKEN first.");
  process.exit(1);
}

console.log("Creating / linking Netlify site:", siteName);
execSync(`npx netlify-cli@latest sites:create --name ${siteName} --manual`, {
  stdio: "inherit",
  env: process.env
});

console.log("\nNext steps:");
console.log("1. Add env vars in Netlify UI (Site settings → Environment):");
console.log("   DATABASE_URL, DIRECT_URL, ADMIN_TOKEN, CRON_SECRET, DEMO_MODE=true");
console.log("2. npx prisma db push   (with production DATABASE_URL in .env)");
console.log("3. npm run netlify:deploy");
console.log("4. GitHub secrets: NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID (from .netlify/state.json)");
