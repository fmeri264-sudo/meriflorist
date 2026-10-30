import crypto from 'crypto'

const TERMINAL_KEY = process.env.TBANK_TERMINAL_KEY!
const TERMINAL_PASSWORD = process.env.TBANK_TERMINAL_PASSWORD!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://merflorist.ru'
const API_URL = 'https://securepay.tinkoff.ru/v2'

/**
 * Генерирует подпись для запроса к Tinkoff API
 * @param params - параметры запроса (без Password)
 * @returns SHA-256 хеш в hex формате
 */
function makeToken(params: Record<string, string | number | boolean | object>): string {
    // Преобразуем объекты в строку для подписи
    const flattened: Record<string, string | number | boolean> = {}
    for (const [key, value] of Object.entries(params)) {
        if (key === 'Receipt') {
            // Receipt не участвует в подписи
            continue
        }
        if (typeof value === 'object') {
            flattened[key] = JSON.stringify(value)
        } else {
            flattened[key] = value as string | number | boolean
        }
    }
    
    const withPassword: Record<string, string | number | boolean> = { 
        ...flattened, 
        Password: TERMINAL_PASSWORD 
    }
    const sorted = Object.keys(withPassword)
        .sort()
        .map(k => String(withPassword[k]))
        .join('')
    return crypto.createHash('sha256').update(sorted).digest('hex')
}

export interface InitPaymentResult {
    paymentUrl: string
    paymentId: string
}

/**
 * Формирует блок Receipt для фискального чека (онлайн-касса)
 * @param params - данные для чека
 * @returns Объект Receipt для Tinkoff API
 */
function buildReceipt(params: {
    email: string
    phone?: string
    items: Array<{
        name: string
        price: number      // в рублях
        quantity: number
        tax?: string       // ставка НДС
    }>
    taxation?: string     // система налогообложения
}) {
    // Формируем список товаров для чека
    const items = params.items.map(item => {
        const priceKopeck = Math.round(item.price * 100)
        const amountKopeck = Math.round(item.price * item.quantity * 100)
        
        return {
            Name: item.name.substring(0, 128),
            Price: priceKopeck,
            Quantity: item.quantity,
            Amount: amountKopeck,
            Tax: item.tax || 'none',
            PaymentMethod: 'full_payment',
            PaymentObject: 'commodity',
        }
    })

    // Возвращаем полный блок Receipt
    return {
        Email: params.email,
        Phone: params.phone || '',
        Taxation: params.taxation || 'osn',
        Items: items,
        FFDVersion: '1.2',
    }
}

/**
 * Инициализирует платеж в системе Tinkoff с поддержкой чеков
 * @param params - параметры платежа
 * @returns объект с URL для оплаты и ID платежа или null при ошибке
 */
export async function initPayment(params: {
    orderId: string | number
    amount: number    // в рублях
    description: string
    orderNumber: string
    customerEmail: string              // Email покупателя (обязательно для чека)
    customerPhone?: string             // Телефон покупателя (опционально)
    items: Array<{                     // Список товаров для чека
        name: string
        price: number                  // в рублях
        quantity: number
        tax?: string                   // 'none' | 'vat0' | 'vat10' | 'vat20' | 'vat110' | 'vat120'
    }>
    taxation?: string                  // Система налогообложения
}): Promise<InitPaymentResult | null> {
    const { 
        orderId, 
        amount, 
        description, 
        orderNumber, 
        customerEmail,
        customerPhone,
        items,
        taxation
    } = params
    
    const amountKopeck = Math.round(amount * 100)

    // Формируем блок Receipt для онлайн-кассы
    const receipt = buildReceipt({
        email: customerEmail,
        phone: customerPhone,
        items: items,
        taxation: taxation || 'osn'
    })

    // Формируем тело запроса с чеком
    const body: Record<string, string | number | object> = {
        TerminalKey: TERMINAL_KEY,
        Amount: amountKopeck,
        OrderId: String(orderId),
        Description: description.substring(0, 256),
        SuccessURL: `${SITE_URL}/order-success?number=${orderNumber}`,
        FailURL: `${SITE_URL}/payment-error?number=${orderNumber}`,
        NotificationURL: `${SITE_URL}/api/payment/result`,
        Receipt: receipt,
    }
    
    body.Token = makeToken(body)

    try {
        console.log('🔵 Отправка запроса в Tinkoff с чеком:', JSON.stringify(body, null, 2))
        
        const res = await fetch(`${API_URL}/Init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10_000),
        })
        
        const data = await res.json()
        console.log('🟢 Ответ Tinkoff:', JSON.stringify(data, null, 2))
        
        if (!data.Success || !data.PaymentURL) {
            console.error('🔴 Ошибка Tinkoff:', data)
            throw new Error(data.Message || 'Ошибка инициализации платежа')
        }
        
        return { 
            paymentUrl: data.PaymentURL, 
            paymentId: String(data.PaymentId) 
        }
    } catch (error) {
        console.error('🔴 Исключение при инициализации:', error)
        return null
    }
}

/**
 * Отменяет/возвращает платеж
 * @param params - параметры отмены
 * @returns статус операции
 */
export async function cancelPayment(params: {
    paymentId: string
    amount?: number // в рублях; если не указано – полный возврат
}): Promise<{
    ok: boolean
    error?: string
}> {
    const body: Record<string, string | number> = {
        TerminalKey: TERMINAL_KEY,
        PaymentId: params.paymentId,
        ...(params.amount !== undefined ? { Amount: Math.round(params.amount * 100) } : {}),
    }
    body.Token = makeToken(body)

    try {
        const res = await fetch(`${API_URL}/Cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10_000),
        })
        const data = await res.json()
        
        if (!data.Success) {
            return { ok: false, error: data.Message ?? 'Ошибка T-Bank' }
        }
        return { ok: true }
    } catch (error) {
        return { ok: false, error: String(error) }
    }
}

/**
 * Проверяет подпись уведомления от Tinkoff
 * @param params - параметры уведомления
 * @returns true если подпись валидна
 */
export function verifyNotification(params: Record<string, string>): boolean {
    const { Token, ...rest } = params
    if (!Token) return false
    const expected = makeToken(rest as Record<string, string | number | boolean>)
    return expected.toLowerCase() === Token.toLowerCase()
}