import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

interface PurchaseDetail {
  sessionId: string
  status: string
  customerEmail?: string
  products?: Array<{
    productId: string
    name: string
    quantity: number
    price: number
  }>
  total?: number
  currency?: string
}

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Support both sessionId and session_id query params for compatibility
  const sessionId = searchParams.get('sessionId') || searchParams.get('session_id')

  useEffect(() => {
    async function verifyPurchase() {
      if (!sessionId) {
        setError('No session ID provided')
        setLoading(false)
        return
      }

      try {
        const res = await fetch(
          `/api/products/purchase-detail?sessionId=${encodeURIComponent(sessionId)}`,
        )
        if (!res.ok) {
          throw new Error('Failed to verify purchase')
        }
        const data = await res.json()
        setPurchase(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    verifyPurchase()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
        <p className="text-gray-600">Verifying your purchase...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link to="/products" className="text-blue-600 hover:underline">
          Return to Products
        </Link>
      </div>
    )
  }

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

  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
      <p className="text-gray-600 mb-6">
        Thank you for your purchase. You now have access to your products.
      </p>

      {purchase?.products && purchase.products.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-3">
            {purchase.products.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-gray-600">
                  {item.name} x{item.quantity}
                </span>
                <span className="font-medium">
                  {formatPrice(item.price * item.quantity, purchase.currency)}
                </span>
              </div>
            ))}
            {purchase.total && (
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">
                  {formatPrice(purchase.total, purchase.currency)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Link
          to="/products"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Continue Shopping
        </Link>
        <Link to="/" className="text-gray-600 hover:underline">
          Return to Home
        </Link>
      </div>
    </div>
  )
}
