import { Link, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export default function Layout() {
  const { user, isPending, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-xl font-bold text-gray-900">
              Store
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/products" className="text-gray-600 hover:text-gray-900 transition">
                Products
              </Link>
              {isPending ? (
                <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
              ) : user ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Your Store. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
