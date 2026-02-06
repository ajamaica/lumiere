import { useEffect, useState } from 'react'

import ProductCard from '../components/ProductCard'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  billingType?: string
  billingPeriod?: string
  status: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products')
        if (!res.ok) {
          throw new Error('Failed to fetch products')
        }
        const data = await res.json()
        // Handle both array response and {data: []} response
        const productList = Array.isArray(data) ? data : data.data || []
        // Filter to only show active products
        setProducts(productList.filter((p: Product) => p.status === 'active'))
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <button onClick={() => window.location.reload()} className="text-blue-600 hover:underline">
          Try again
        </button>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">No Products Available</h2>
        <p className="text-gray-500">Check back later for new products!</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Our Products</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
