'use client'

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { usePopup } from "@/components/ui/popup"
import { useRouter } from "next/navigation"

export default function AccountPage() {
  const supabase = createClient()
  const { show } = usePopup()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [mode, setMode] = useState<'buyer' | 'seller'>('buyer')
  const [listings, setListings] = useState<any[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('mode')
        .eq('id', session.user.id)
        .maybeSingle()
      if (profile?.mode) setMode(profile.mode as 'buyer' | 'seller')

      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false })
      setListings(products || [])
      setLoading(false)
    }
    init()
  }, [])

  const updateMode = async (next: 'buyer' | 'seller') => {
    setMode(next)
    await supabase.from('profiles').update({ mode: next }).eq('id', user.id)
  }

  const markSold = async (id: string) => {
    const { error } = await supabase.from('products').update({ status: 'sold', sold_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      show({ message: 'Failed to mark as sold.' })
    } else {
      setListings(prev => prev.map(p => p.id === id ? { ...p, status: 'sold' } : p))
      show({ message: 'Marked as sold.' })
    }
  }

  const deleteItem = async (id: string) => {
    show({
      message: 'Delete this item?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        const { error } = await supabase.from('products').delete().eq('id', id)
        if (error) {
          show({ message: 'Failed to delete item.' })
        } else {
          setListings(prev => prev.filter(p => p.id !== id))
          show({ message: 'Item deleted.' })
        }
      }
    })
  }

  if (loading) return <div className="min-h-screen bg-[var(--color-pastel-bg)] flex items-center justify-center">Loading...</div>

  return (
    <main className="min-h-screen bg-[var(--color-pastel-bg)]">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold text-[var(--color-pastel-text)]">Your Account</h1>

        <div className="bg-white rounded-2xl border border-[var(--color-pastel-border)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-600">Mode</div>
              <div className="text-xl font-semibold capitalize">{mode}</div>
            </div>
            <div className="flex gap-2">
              <Button variant={mode === 'buyer' ? 'default' : 'outline'} onClick={() => updateMode('buyer')}>Buyer</Button>
              <Button variant={mode === 'seller' ? 'default' : 'outline'} onClick={() => updateMode('seller')}>Seller</Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-[var(--color-pastel-text)]">Your Listings</h2>
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {listings.map((p) => (
                <div key={p.id} className="bg-white rounded-xl overflow-hidden border border-[var(--color-pastel-border)] p-4 flex flex-col gap-3">
                  <div className="h-40 bg-gray-100 rounded-lg overflow-hidden">
                    {p.images && p.images[0] ? (
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>}
                  </div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-gray-500">${p.price}</div>
                  <div className="text-xs text-gray-400">Status: {p.status}</div>
                  <div className="flex gap-2">
                    <Button variant="pastelAccent" onClick={() => markSold(p.id)}>Mark Sold</Button>
                    <Button variant="destructive" onClick={() => deleteItem(p.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
              No listings yet.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
