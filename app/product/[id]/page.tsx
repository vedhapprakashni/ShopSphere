'use client'

import { createClient } from "@/lib/supabase/client"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { MessageCircle, MapPin } from "lucide-react"
import { notFound, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [negotiating, setNegotiating] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { id } = params // Next.js 15+ unwraps params automatically in async server components, but this is a client component now

  useEffect(() => {
    async function fetchProduct() {
      // Since params is a Promise in newer Next.js versions for Server Components,
      // but in Client Components we access it directly or via props.
      // However, to be safe with the latest types, we can treat it as an object if passed directly.
      // Let's just use the id directly.
      
      const { data, error } = await supabase
        .from('products')
        .select('*, profiles(full_name, avatar_url)')
        .eq('id', id)
        .single()

      if (error) {
        console.error(error)
      } else {
        setProduct(data)
      }
      setLoading(false)
    }
    fetchProduct()
  }, [id, supabase])

  const handleStartNegotiation = async () => {
    setNegotiating(true)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    if (session.user.id === product.seller_id) {
        alert("You cannot negotiate on your own product!")
        setNegotiating(false)
        return
    }

    try {
        // Check if a negotiation already exists
        const { data: existing } = await supabase
            .from('negotiations')
            .select('id')
            .eq('product_id', product.id)
            .eq('buyer_id', session.user.id)
            .single()

        if (existing) {
            router.push(`/chat?negotiation=${existing.id}`)
            return
        }

        // Create new negotiation
        const { data: newNegotiation, error } = await supabase
            .from('negotiations')
            .insert({
                product_id: product.id,
                buyer_id: session.user.id,
                seller_id: product.seller_id,
                pitch_price: product.price, // Start with asking price
                status: 'pending'
            })
            .select()
            .single()

        if (error) throw error

        router.push(`/chat?negotiation=${newNegotiation.id}`)

    } catch (error) {
        console.error(error)
        alert("Failed to start negotiation")
    } finally {
        setNegotiating(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[var(--color-pastel-bg)] flex items-center justify-center">Loading...</div>
  if (!product) return <div className="min-h-screen bg-[var(--color-pastel-bg)] flex items-center justify-center">Product not found</div>

  return (
    <main className="min-h-screen bg-[var(--color-pastel-bg)]">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-[var(--color-pastel-border)]">
          
          {/* Image Section */}
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative">
            {product.images && product.images[0] ? (
              <img 
                src={product.images[0]} 
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image Available
              </div>
            )}
            {product.is_negotiable && (
                <span className="absolute top-4 right-4 bg-[var(--color-pastel-accent)] text-slate-800 font-bold px-4 py-2 rounded-full shadow-md">
                    Open to Offers
                </span>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-[var(--color-pastel-text)] mb-2">{product.title}</h1>
              <div className="flex items-center text-gray-500 gap-2">
                <MapPin className="h-4 w-4" />
                <span>{product.location}</span>
              </div>
            </div>

            <div className="text-5xl font-bold text-[var(--color-pastel-primary)]">
              ${product.price}
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Description</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                </p>
            </div>

            <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500">
                        {product.profiles?.full_name?.[0] || 'U'}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{product.profiles?.full_name || 'Seller'}</p>
                        <p className="text-sm text-gray-500">Joined recently</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <Button size="lg" className="flex-1 text-lg h-14 rounded-xl">
                        Buy Now
                    </Button>
                    <Button 
                        size="lg" 
                        variant="outline" 
                        className="flex-1 text-lg h-14 rounded-xl border-2"
                        onClick={handleStartNegotiation}
                        disabled={negotiating}
                    >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        {negotiating ? 'Starting...' : 'Chat / Offer'}
                    </Button>
                </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
