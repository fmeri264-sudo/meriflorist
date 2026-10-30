import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET ?? ''
const INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

async function run() {
  try {
    const res = await fetch(`${SITE_URL}/api/cron/send-reviews`, {
      method: 'POST',
      headers: { 'x-cron-secret': CRON_SECRET },
    })
    const data = await res.json()
    console.log(`[${new Date().toISOString()}] send-reviews:`, data)
  } catch (e) {
    console.error(`[${new Date().toISOString()}] send-reviews error:`, e.message)
  }
}

run()
setInterval(run, INTERVAL_MS)
