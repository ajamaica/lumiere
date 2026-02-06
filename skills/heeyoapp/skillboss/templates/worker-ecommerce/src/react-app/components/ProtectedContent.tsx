import { ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

interface ProtectedContentProps {
  productId: string
  children: ReactNode
  fallback?: ReactNode
}

/**
 * ProtectedContent - Wrapper component that checks purchase access
 *
 * Use this to gate content behind a purchase:
 *
 * <ProtectedContent productId="your-product-id">
 *   <YourPremiumContent />
 * </ProtectedContent>
 */
export default function ProtectedContent({ productId, children, fallback }: ProtectedContentProps) {
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/products/${productId}/check-access`, {
          credentials: 'include',
        })
        const data = await res.json()
        setHasAccess(data.hasAccess)
        setMessage(data.message)
      } catch {
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [productId, user])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (hasAccess) {
    return <>{children}</>
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>
  }

  // Default paywall UI
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-6 h-6 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Content</h3>
      <p className="text-gray-600 mb-4">{message || 'Purchase required to access this content.'}</p>
      {!user ? (
        <Link
          to="/login"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Sign In to Access
        </Link>
      ) : (
        <Link
          to="/products"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          View Products
        </Link>
      )}
    </div>
  )
}
