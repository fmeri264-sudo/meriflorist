import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config({ path: '/home/helen/project/meriflorist/.env' })
const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://meriflorist.ru'}/api/admin/sync-inventory`
const secret = process.env.INVENTORY_SYNC_SECRET
const logFile = process.env.INVENTORY_SYNC_LOG || '/var/log/meriflorist-inventory-sync.log'
const stateFile = process.env.INVENTORY_SYNC_STATE || '/tmp/meriflorist-inventory-sync.state'
const maxToken = process.env.MAX_BOT_TOKEN
const maxUser = process.env.MAX_ADMIN_USER_ID

function log(line) {
  const text = `${new Date().toISOString()} ${line}\n`
  try { fs.appendFileSync(logFile, text) } catch { console.log(text.trim()) }
}
async function notify(text) {
  if (!maxToken || !maxUser) return
  try { await fetch(`https://platform-api.max.ru/messages?user_id=${encodeURIComponent(maxUser)}`, { method: 'POST', headers: { Authorization: maxToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }) } catch (e) { log(`MAX_NOTIFY_ERROR ${e.message}`) }
}
if (!secret) { log('FAIL missing INVENTORY_SYNC_SECRET'); process.exit(2) }
let last = ''
try { last = fs.readFileSync(stateFile, 'utf8').trim() } catch {}
let ok = false, detail = ''
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'x-inventory-sync-secret': secret } })
    detail = await res.text()
    if (res.ok) { ok = true; break }
    log(`FAIL attempt=${attempt} HTTP=${res.status} body=${detail.slice(0, 300)}`)
  } catch (e) { detail = e.message; log(`FAIL attempt=${attempt} ${detail}`) }
  await new Promise(r => setTimeout(r, attempt * 5000))
}
if (ok) {
  fs.writeFileSync(stateFile, '0')
  log(`OK ${detail}`)
} else {
  const failures = Number(last || 0) + 1
  fs.writeFileSync(stateFile, String(failures))
  if (failures >= 3) await notify(`❌ Синхронизация остатков meriflorist не выполнена ${failures} запусков подряд.`)
  process.exit(1)
}
