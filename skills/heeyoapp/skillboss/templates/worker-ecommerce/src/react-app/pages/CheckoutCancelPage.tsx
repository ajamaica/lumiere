import { Link } from 'react-router-dom'

export default function CheckoutCancelPage() {
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-yellow-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
      <p className="text-gray-600 mb-6">Your payment was cancelled. No charges have been made.</p>
      <div className="flex flex-col gap-3">
        <Link
          to="/products"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Return to Products
        </Link>
        <Link to="/" className="text-gray-600 hover:underline">
          Go to Home
        </Link>
      </div>
    </div>
  )
}
