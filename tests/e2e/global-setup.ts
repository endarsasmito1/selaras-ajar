import { execSync } from "child_process";
import { request as playwrightRequest, type FullConfig } from "@playwright/test";
import { ACCOUNTS } from "./helpers/accounts";
import path from "path";
import fs from "fs";

const AUTH_DIR = path.join(__dirname, ".auth");

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  console.log("🌱 Reseeding database ke state bersih sebelum test suite jalan...");
  execSync("npm run db:seed", { cwd: path.resolve(__dirname, "../.."), stdio: "inherit" });

  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  const requestContext = await playwrightRequest.newContext({ baseURL });
  for (const [role, acc] of Object.entries(ACCOUNTS)) {
    const res = await requestContext.post("/api/auth/login", {
      form: { email: acc.email, password: acc.password },
      maxRedirects: 0,
    });
    if (res.status() !== 303) {
      throw new Error(`Login setup gagal untuk role ${role} (${acc.email}): status ${res.status()}`);
    }
    await requestContext.storageState({ path: path.join(AUTH_DIR, `${role}.json`) });
  }
  await requestContext.dispose();
  console.log("✓ Storage state login tersimpan untuk semua peran.");
}
