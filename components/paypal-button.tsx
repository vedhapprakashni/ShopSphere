'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    paypal: any
  }
}

export default function PayPalButton({ amount, negotiationId }: { amount: number, negotiationId: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId) return
    const url = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`
    const s = document.createElement('script')
    s.src = url
    s.onload = () => {
      if (!window.paypal || !ref.current) return
      window.paypal.Buttons({
        createOrder: async () => {
          const res = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, negotiationId }),
          })
          const data = await res.json()
          return data.id
        },
        onApprove: async (data: any) => {
          await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID, negotiationId }),
          })
          alert('Payment completed')
        }
      }).render(ref.current)
    }
    document.body.appendChild(s)
    return () => { s.remove() }
  }, [amount, negotiationId])

  return <div ref={ref} />
}
