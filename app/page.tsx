import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()
  
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-[var(--color-pastel-bg)]">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[var(--color-pastel-text)]">
          Buy & Sell with <span className="text-[var(--color-pastel-primary)]">Ease</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover unique items, negotiate deals in real-time, and connect with your local community. 
          Simple, safe, and beautiful.
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" className="rounded-full text-lg px-8" asChild>
            <Link href="/sell">Start Selling</Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-full text-lg px-8" asChild>
            <Link href="#listings">Explore Items</Link>
          </Button>
        </div>
      </section>

      {/* Featured Categories (Placeholder) */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8 text-[var(--color-pastel-text)]">Featured Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Electronics', 'Fashion', 'Home & Living', 'Hobbies'].map((category) => (
            <div key={category} className="aspect-square rounded-2xl bg-white p-6 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-[var(--color-pastel-border)]">
              <span className="font-semibold text-lg">{category}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Listings */}
       <section id="listings" className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8 text-[var(--color-pastel-text)]">Fresh Finds Near You</h2>
        
        {products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                    <Link href={`/product/${product.id}`} key={product.id}>
                        <div className="bg-white rounded-xl overflow-hidden border border-[var(--color-pastel-border)] hover:shadow-lg transition-all group cursor-pointer h-full flex flex-col">
                            <div className="h-48 bg-gray-100 relative overflow-hidden">
                                {product.images && product.images[0] ? (
                                    <img 
                                        src={product.images[0]} 
                                        alt={product.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                        No Image
                                    </div>
                                )}
                                {product.is_negotiable && (
                                    <span className="absolute top-2 right-2 bg-[var(--color-pastel-accent)] text-xs font-bold px-2 py-1 rounded-full text-slate-700 shadow-sm">
                                        Negotiable
                                    </span>
                                )}
                            </div>
                            <div className="p-4 space-y-2 flex-1 flex flex-col">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-medium text-lg line-clamp-1">{product.title}</h3>
                                    <span className="font-bold text-[var(--color-pastel-primary)]">${product.price}</span>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2 flex-1">{product.description}</p>
                                <div className="pt-2 text-xs text-gray-400 flex items-center gap-1">
                                    <span>📍 {product.location}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No items listed yet. Be the first!</p>
                <Button variant="link" asChild className="mt-2">
                    <Link href="/sell">List an Item</Link>
                </Button>
            </div>
        )}
      </section>
    </main>
  )
}
