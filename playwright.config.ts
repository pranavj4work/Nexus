import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  expect: { timeout: 15_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "MOCK_API_DELAY_MS=0 npm run dev -- --port 3000",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
