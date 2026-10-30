import crypto from 'crypto'

const MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN!
const TEST_MODE = process.env.ROBOKASSA_TEST_MODE === 'true'
const PASSWORD1 = TEST_MODE
  ? (process.env.ROBOKASSA_TEST_PASSWORD1 || process.env.ROBOKASSA_PASSWORD1!)
  : process.env.ROBOKASSA_PASSWORD1!
const PASSWORD2 = TEST_MODE
  ? (process.env.ROBOKASSA_TEST_PASSWORD2 || process.env.ROBOKASSA_PASSWORD2!)
  : process.env.ROBOKASSA_PASSWORD2!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://meriflorist.ru'

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

export function buildPaymentUrl(params: {
  invId: number
  amount: number
  description: string
  orderNumber?: string
  email?: string
}): string {
  const { invId, amount, description, orderNumber, email } = params
  const outSum = amount.toFixed(2)
  const signatureStr = `${MERCHANT_LOGIN}:${outSum}:${invId}:${PASSWORD1}`
  const signature = md5(signatureStr)

  const query = new URLSearchParams({
    MerchantLogin: MERCHANT_LOGIN,
    OutSum: outSum,
    InvId: String(invId),
    Description: description,
    SignatureValue: signature,
    IsTest: TEST_MODE ? '1' : '0',
    Culture: 'ru',
    Encoding: 'utf-8',
    SuccessURL: `${SITE_URL}/order-success${orderNumber ? `?number=${orderNumber}` : ''}`,
    FailURL: `${SITE_URL}/checkout`,
    ...(email ? { Email: email } : {}),
  })

  return `https://auth.robokassa.ru/Merchant/Index.aspx?${query.toString()}`
}

export function verifyResultSignature(params: {
  outSum: string
  invId: string
  signatureValue: string
}): boolean {
  const { outSum, invId, signatureValue } = params
  const expected = md5(`${outSum}:${invId}:${PASSWORD2}`)
  return expected.toLowerCase() === signatureValue.toLowerCase()
}
