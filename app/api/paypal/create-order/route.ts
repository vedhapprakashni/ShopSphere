import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const amount = Number(body.amount)
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  const clientId = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_SECRET
  const base = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'
  if (!clientId || !secret) return NextResponse.json({ error: 'Missing PayPal credentials' }, { status: 500 })

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  })
  const token = await tokenRes.json()

  const orderRes = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: 'USD', value: amount.toFixed(2) } }],
    }),
  })
  const order = await orderRes.json()
  return NextResponse.json(order)
}
