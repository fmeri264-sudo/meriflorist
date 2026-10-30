export async function getAdminToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD ?? 'admin123'
  const data = new TextEncoder().encode(password + 'meriflorist-2026')
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}
