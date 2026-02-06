import { useEffect, useState } from 'react'

/**
 * OAuth Callback Handler for Popup Flow
 *
 * This page runs INSIDE the popup window after Google redirects back.
 * It exchanges the authorization code for a session, then closes the popup
 * and notifies the parent window.
 */
export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization code from URL
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const errorParam = urlParams.get('error')

        if (errorParam) {
          throw new Error(errorParam)
        }

        if (!code) {
          throw new Error('No authorization code received')
        }

        // Exchange the code for a session token
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          credentials: 'include',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create session')
        }

        setStatus('success')

        // Notify the parent window that login succeeded
        if (window.opener) {
          window.opener.postMessage({ type: 'oauth-success' }, window.location.origin)
          window.close()
        } else {
          // If no opener (user navigated directly), redirect to home
          window.location.href = '/'
        }
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Login failed')

        // Notify parent of failure
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'oauth-error',
              error: err instanceof Error ? err.message : 'Login failed',
            },
            window.location.origin,
          )
          setTimeout(() => window.close(), 2000)
        }
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 text-center">
      {status === 'processing' && (
        <>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Completing login...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-4">
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
          <p className="text-green-600 text-lg font-medium">Login successful!</p>
          <p className="text-gray-500">This window will close...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-red-600"
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
          <p className="text-red-600 text-lg font-medium">Login failed</p>
          <p className="text-gray-500">{error}</p>
        </>
      )}
    </div>
  )
}
