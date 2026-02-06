import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { user, isPending, sendOTP, verifyOTP, refetch } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'google' | 'email'>('google')

  // Get redirect URL from location state
  const from = (location.state as any)?.from?.pathname || '/'

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isPending) {
      navigate(from, { replace: true })
    }
  }, [user, isPending, navigate, from])

  // Listen for OAuth popup messages
  const handleOAuthMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data?.type === 'oauth-success') {
        // Refresh auth state and redirect
        if (refetch) await refetch()
        navigate(from, { replace: true })
      } else if (event.data?.type === 'oauth-error') {
        setError(event.data.error || 'Google login failed')
        setLoading(false)
      }
    },
    [from, navigate, refetch],
  )

  useEffect(() => {
    window.addEventListener('message', handleOAuthMessage)
    return () => window.removeEventListener('message', handleOAuthMessage)
  }, [handleOAuthMessage])

  // Google OAuth with popup
  const handleGoogleLogin = async () => {
    try {
      setError('')
      setLoading(true)

      // Get the OAuth redirect URL from backend
      // IMPORTANT: Only pass the origin, NOT the full callback path
      const response = await fetch(
        `/api/oauth/google/redirect_url?originUrl=${encodeURIComponent(window.location.origin)}`,
      )
      const data = await response.json()

      if (!data.redirectUrl) {
        throw new Error('Failed to get OAuth URL')
      }

      // Open popup window centered on screen
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        data.redirectUrl,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=yes`,
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Monitor if user closes popup manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          setLoading(false)
        }
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed')
      setLoading(false)
    }
  }

  // Email OTP handlers
  const handleSendOTP = async () => {
    if (!email) {
      setError('Please enter your email')
      return
    }
    try {
      setError('')
      setLoading(true)
      await sendOTP(email)
      setOtpSent(true)
    } catch (err) {
      setError('Failed to send code. Please check your email.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp) {
      setError('Please enter the verification code')
      return
    }
    try {
      setError('')
      setLoading(true)
      await verifyOTP(email, otp)
      navigate(from, { replace: true })
    } catch (err) {
      setError('Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Sign in</h2>
          <p className="mt-2 text-gray-600">to continue to the store</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Login Method Toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            className={`flex-1 py-2 text-sm font-medium transition ${
              loginMethod === 'google'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setLoginMethod('google')}
          >
            Google
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium transition ${
              loginMethod === 'email'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setLoginMethod('email')}
          >
            Email
          </button>
        </div>

        <div className="mt-8 space-y-6">
          {loginMethod === 'google' ? (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>
          ) : !otpSent ? (
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
              />
              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                Enter the code sent to <strong>{email}</strong>
              </p>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
              />
              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                onClick={() => {
                  setOtpSent(false)
                  setOtp('')
                }}
                disabled={loading}
                className="w-full text-gray-600 hover:text-gray-900 text-sm"
              >
                Use different email
              </button>
            </div>
          )}
        </div>

        <div className="text-center">
          <Link to="/" className="text-blue-600 hover:underline text-sm">
            Back to store
          </Link>
        </div>
      </div>
    </div>
  )
}
