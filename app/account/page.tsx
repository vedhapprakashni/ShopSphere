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
  const [purchases, setPurchases] = useState<any[]>([])
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })

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

      if ((profile?.mode || 'buyer') === 'seller') {
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', session.user.id)
          .order('created_at', { ascending: false })
        setListings(products || [])
      } else {
        const { data: tx } = await supabase
          .from('transactions')
          .select('*, negotiations(product_id), products:negotiations_product_id_fkey(*))')
          .eq('buyer_id', session.user.id)
          .order('created_at', { ascending: false })
        setPurchases(tx || [])
      }
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
          show({ message: 'Item deleted.', onConfirm: () => { router.push('/'); router.refresh() } })
          await supabase.from('recent_views').delete().eq('product_id', id)
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <div className="text-gray-600">Email</div>
              <div className="font-medium">{user.email}</div>
            </div>
            <div className="space-y-2">
              <div className="text-gray-600">User ID</div>
              <div className="text-sm text-gray-500">{user.id}</div>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-100">
            <h3 className="font-semibold mb-3">Change Password</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="password" placeholder="Current" value={passwords.current} onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))} className="h-10 px-3 rounded-lg border border-gray-200" />
              <input type="password" placeholder="New" value={passwords.next} onChange={(e) => setPasswords(p => ({ ...p, next: e.target.value }))} className="h-10 px-3 rounded-lg border border-gray-200" />
              <input type="password" placeholder="Confirm" value={passwords.confirm} onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))} className="h-10 px-3 rounded-lg border border-gray-200" />
            </div>
            <div className="mt-3">
              <Button onClick={async () => {
                if (passwords.next.length < 6 || passwords.next !== passwords.confirm) {
                  show({ message: 'Passwords do not match or are too short.' })
                  return
                }
                const { error } = await supabase.auth.updateUser({ password: passwords.next })
                if (error) {
                  show({ message: error.message })
                } else {
                  show({ message: 'Password updated.' })
                  setPasswords({ current: '', next: '', confirm: '' })
                }
              }}>Update Password</Button>
            </div>
            <div className="text-xs text-gray-500 mt-2">If you use Google login, password changes are managed by Google.</div>
          </div>
        </div>

        {mode === 'seller' ? (
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
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--color-pastel-text)]">Your Purchases</h2>
            {purchases.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {purchases.map((t) => (
                  <div key={t.id} className="bg-white rounded-xl overflow-hidden border border-[var(--color-pastel-border)] p-4 flex flex-col gap-3">
                    <div className="text-sm text-gray-500">Amount: ${t.amount}</div>
                    <div className="text-sm text-gray-500">Order: {t.order_id}</div>
                    <div className="text-xs text-gray-400">Status: {t.status}</div>
                    <div className="text-xs text-gray-400">Date: {new Date(t.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                No purchases yet.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
