import { defineConfig } from '@playwright/test'
import process from 'node:process'

const runId = process.pid
const testDatabase = `/tmp/odontospace-e2e-${runId}.db`
const uploads = `/tmp/odontospace-e2e-uploads-${runId}`

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:5178',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `DATABASE_URL=sqlite:///${testDatabase} DIAGNOSTIC_UPLOAD_ROOT=${uploads} PYTHONPATH=../backend SECRET_KEY=e2e-secret ADMIN_PASSWORD=AdminTest123! ../.venv/bin/uvicorn main:app --app-dir ../backend --host 127.0.0.1 --port 8766`,
      url: 'http://127.0.0.1:8766/openapi.json',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'VITE_API_PROXY_TARGET=http://127.0.0.1:8766 npm run dev -- --host 127.0.0.1 --port 5178',
      url: 'http://127.0.0.1:5178/login',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
})
