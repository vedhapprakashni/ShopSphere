'use client'

import { useState } from 'react'
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'

export default function SellPage() {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        alert("Please log in to list an item.")
        router.push('/login')
        return
      }

      const formData = new FormData(e.currentTarget)
      const title = formData.get('title') as string
      const price = formData.get('price') as string
      const description = formData.get('description') as string
      const location = formData.get('location') as string
      const isNegotiable = formData.get('negotiable') === 'on'
      const priceValue = Number(price)
      if (!title?.trim() || Number.isNaN(priceValue) || priceValue <= 0 || !description?.trim() || !location?.trim()) {
        alert("Please fill all fields with valid values.")
        return
      }

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!existingProfile) {
        const { error: profileInsertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
          })
        if (profileInsertError) {
          throw profileInsertError
        }
      }

      let imageUrl = null
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${session.user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file)

        if (uploadError) {
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)
        
        imageUrl = publicUrl
      }

      const { error: insertError } = await supabase
        .from('products')
        .insert({
          seller_id: session.user.id,
          title,
          price: priceValue,
          description,
          location,
          is_negotiable: isNegotiable,
          images: imageUrl ? [imageUrl] : [],
          status: 'active'
        })

      if (insertError) throw insertError

      alert("Item listed successfully!")
      router.push('/')
      
    } catch (error: any) {
      const msg = typeof error?.message === 'string' ? error.message : 'Failed to list item.'
      if (msg.toLowerCase().includes('storage bucket') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('does not exist')) {
        alert("Image upload failed. Please create a 'product-images' storage bucket in Supabase and try again.")
      } else {
        alert(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-pastel-bg)]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8 text-[var(--color-pastel-text)]">Sell an Item</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl border border-[var(--color-pastel-border)] shadow-sm">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Product Title</label>
            <input name="title" required type="text" placeholder="e.g. Vintage Denim Jacket" className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-primary)]" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Price ($)</label>
            <input name="price" required type="number" min="0" step="0.01" placeholder="0.00" className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-primary)]" />
          </div>

          <div className="flex items-center space-x-2">
             <input name="negotiable" type="checkbox" id="negotiable" className="w-4 h-4 text-[var(--color-pastel-primary)] rounded focus:ring-[var(--color-pastel-primary)]" />
             <label htmlFor="negotiable" className="text-sm text-gray-700">Open to negotiation (Allow users to pitch prices)</label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" required rows={4} className="w-full p-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-primary)]" placeholder="Describe your item..." />
          </div>

           <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Location</label>
            <input name="location" required type="text" placeholder="City, State" className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-primary)]" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Photos</label>
            <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-[var(--color-pastel-primary)] transition-colors">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="text-[var(--color-pastel-primary)] font-medium">
                    Selected: {file.name}
                </div>
              ) : (
                <>
                    <Upload className="h-8 w-8 mb-2" />
                    <span>Click to upload photos</span>
                </>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
            {loading ? 'Listing Item...' : 'List Item'}
          </Button>

        </form>
      </div>
    </main>
  )
}
