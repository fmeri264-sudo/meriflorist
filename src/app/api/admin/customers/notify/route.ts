import { NextRequest, NextResponse } from 'next/server'

const SB = process.env.SUPABASE_URL!
const KEY = process.env.SUPABASE_ANON_KEY!
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY не настроен' }

  const from = process.env.EMAIL_FROM ?? 'Meri Florist <noreply@meriflorist.ru>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { ok: false, error: `Resend ${res.status}: ${err}` }
  }
  return { ok: true }
}

function buildHtml(message: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#fdf2f8;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f8;padding:40px 20px">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#f43f8e;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:bold">🌸 Meri Florist</p>
        </td></tr>
        <tr><td style="padding:32px;color:#374151;font-size:15px;line-height:1.7">
          ${message.replace(/\n/g, '<br>')}
        </td></tr>
        <tr><td style="padding:24px 32px;background:#fdf2f8;text-align:center">
          <a href="https://meriflorist.ru" style="display:inline-block;background:#f43f8e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:30px;font-weight:600">
            Перейти в магазин
          </a>
        </td></tr>
        <tr><td style="padding:16px 32px;color:#9ca3af;font-size:12px;text-align:center">
          Meri Florist · meriflorist.ru · +7 (931) 991-28-39
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const { subject, message, recipientIds } = await req.json()

  if (!subject || !message) {
    return NextResponse.json({ error: 'subject и message обязательны' }, { status: 400 })
  }

  // Получаем список покупателей
  let url = `${SB}/rest/v1/Customer?select=id,firstName,lastName,email&email=not.is.null`
  if (recipientIds?.length) {
    url = `${SB}/rest/v1/Customer?select=id,firstName,lastName,email&id=in.(${recipientIds.join(',')})&email=not.is.null`
  }

  const res = await fetch(url, { headers: h })
  const customers: { id: number; firstName: string; lastName: string | null; email: string }[] = await res.json()

  if (!customers.length) {
    return NextResponse.json({ error: 'Нет покупателей с email' }, { status: 400 })
  }

  const html = buildHtml(message, subject)
  const results = await Promise.allSettled(
    customers.map(c => sendEmail(c.email, subject, html))
  )

  const sent = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
  const errors = results
    .map((r, i) => r.status === 'fulfilled' && !r.value.ok
      ? `${customers[i].email}: ${r.value.error}`
      : r.status === 'rejected' ? `${customers[i].email}: ошибка` : null
    )
    .filter(Boolean)

  return NextResponse.json({ sent, total: customers.length, errors })
}
