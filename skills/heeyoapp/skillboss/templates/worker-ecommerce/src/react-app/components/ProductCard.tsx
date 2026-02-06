import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  billingType?: string
  billingPeriod?: string
}

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const formatPrice = (cents: number, currency: string = 'usd') => {
    const amount = cents / 100
    const symbols: Record<string, string> = {
      usd: '$',
      eur: '€',
      gbp: '£',
    }
    const symbol = symbols[currency.toLowerCase()] || currency.toUpperCase() + ' '
    return `${symbol}${amount.toFixed(2)}`
  }

  const getBillingLabel = () => {
    if (product.billingType === 'recurring' && product.billingPeriod) {
      return `/${product.billingPeriod}`
    }
    return ''
  }

  const handlePurchase = async () => {
    if (!user) {
      // Navigate to login, saving current location for redirect back
      navigate('/login', { state: { from: { pathname: '/products' } } })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          products: [{ productId: product.id, quantity: 1 }],
          successRouter: '/checkout/success',
          cancelRouter: '/checkout/cancel',
        }),
      })

      const data = await res.json()

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data.code === 'UNAUTHORIZED') {
        navigate('/login', { state: { from: { pathname: '/products' } } })
      } else {
        alert(data.message || 'Failed to create checkout session')
      }
    } catch (err) {
      alert('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
      {/* Product Image Placeholder */}
      <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
        <svg
          className="w-16 h-16 text-blue-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
        {product.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(product.price, product.currency)}
            </span>
            <span className="text-gray-500 text-sm">{getBillingLabel()}</span>
          </div>
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing
              </span>
            ) : (
              'Buy Now'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
