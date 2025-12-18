import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const orderID = body.orderID as string
  const negotiationId = body.negotiationId as string

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

  const captureRes = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token.access_token}` },
  })
  const capture = await captureRes.json()

  const amount = Number(capture?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value)

  const { data: negotiation } = await supabase
    .from('negotiations')
    .select('*')
    .eq('id', negotiationId)
    .maybeSingle()

  if (negotiation) {
    if (negotiation.final_offer_expires_at && new Date(negotiation.final_offer_expires_at) <= new Date()) {
      return NextResponse.json({ error: 'Final offer expired' }, { status: 400 })
    }
    await supabase
      .from('transactions')
      .insert({
        negotiation_id: negotiationId,
        buyer_id: negotiation.buyer_id,
        seller_id: negotiation.seller_id,
        amount: amount || negotiation.final_price || negotiation.pitch_price,
        order_id: orderID,
        status: 'captured',
      })
    await supabase
      .from('products')
      .update({ status: 'sold', sold_at: new Date().toISOString() })
      .eq('id', negotiation.product_id)
    await supabase
      .from('negotiations')
      .update({ status: 'paid' })
      .eq('id', negotiationId)
  }

  return NextResponse.json(capture)
}
