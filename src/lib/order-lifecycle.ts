import { notifyDelivered, notifyCancel } from './meribuket'
import { getDeliveryClaimInfo } from './yandex-delivery'

const headers = () => ({ apikey: process.env.SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' })
export async function orderRequest(query: string, init?: RequestInit) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/Order?${query}`, { ...init, headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error(`Order database: ${res.status}`)
  return res
}
export async function changeOrderStatus(number: string, status: string) {
  if (!['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'].includes(status)) throw new Error('Invalid status')
  const rows = await (await orderRequest(`number=eq.${encodeURIComponent(number)}&select=*`)).json()
  const order = rows[0]
  if (!order) throw new Error('Order not found')
  if (order.status !== status) {
    if (['DELIVERED', 'CANCELLED'].includes(order.status)) throw new Error('Order already completed')
    const ranks: Record<string, number> = { PENDING: 0, CONFIRMED: 1, IN_PROGRESS: 2, DELIVERED: 3 }
    if (status !== 'CANCELLED' && ranks[status] < ranks[order.status]) throw new Error('Cannot revert order status')
    await orderRequest(`id=eq.${order.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
  }
  const mapped: Record<string, string> = { PENDING: 'new', CONFIRMED: 'assembled', IN_PROGRESS: 'processing', DELIVERED: 'handed', CANCELLED: 'cancelled' }
  let ok = true
  if (status === 'DELIVERED') ok = await notifyDelivered(number)
  else if (status === 'CANCELLED') ok = await notifyCancel(number)
  else {
    const res = await fetch(`${process.env.MERIBUKET_URL || 'https://meribuket.ru'}/api/ext/order/${encodeURIComponent(number)}/status`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.MERIBUKET_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: mapped[status] }),
    })
    ok = res.ok
  }
  if (!ok) throw new Error('Status saved; Meribuket synchronization failed')
  return { ...order, status }
}
export async function refreshDeliveryStatuses() {
  const orders = await (await orderRequest('ydClaimId=not.is.null&status=not.in.(DELIVERED,CANCELLED)&select=number,ydClaimId,status')).json()
  for (const order of orders) {
    const info = await getDeliveryClaimInfo(order.ydClaimId)
    if (info.error) continue
    const status = ['delivered', 'delivered_finish'].includes(info.status) ? 'DELIVERED'
      : ['pickuped', 'delivery_arrived', 'ready_for_delivery_confirmation'].includes(info.status) ? 'IN_PROGRESS' : null
    if (status) await changeOrderStatus(order.number, status)
  }
}
