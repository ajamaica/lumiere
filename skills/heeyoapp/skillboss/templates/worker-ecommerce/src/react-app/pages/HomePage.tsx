import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <section className="text-center py-20">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">Welcome to Our Store</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Discover our amazing products. Quality items at great prices.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/products"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Browse Products
          </Link>
          {!user && (
            <Link
              to="/login"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 border-t">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
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
            <h3 className="text-lg font-semibold mb-2">Secure Payments</h3>
            <p className="text-gray-600">
              Your transactions are protected with Stripe's industry-leading security.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Instant Access</h3>
            <p className="text-gray-600">Get immediate access to your purchases after payment.</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">24/7 Support</h3>
            <p className="text-gray-600">
              Need help? Our support team is always here to assist you.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
