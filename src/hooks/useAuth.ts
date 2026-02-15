import { useAtom } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'

import { mobileApi, MobileApiRequestError } from '../services/mobile/api'
import {
  deleteSessionToken,
  getSessionToken,
  setSessionToken,
} from '../services/mobile/sessionToken'
import { mobileAuthenticatedAtom, mobileUserAtom } from '../store/mobileAtoms'
import type { MobileUser } from '../store/mobileTypes'
import { logger } from '../utils/logger'

const log = logger.create('useAuth')

export interface UseAuthResult {
  /** The currently signed-in user, or null */
  user: MobileUser | null
  /** Whether the session token has been loaded and is valid */
  authenticated: boolean
  /** Whether an auth operation (sign-in, restore) is in progress */
  loading: boolean
  /** Last error from an auth operation */
  error: string | null
  /** Sign in with a Google ID token */
  signIn: (googleIdToken: string) => Promise<void>
  /** Sign out and clear all stored credentials */
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useAtom(mobileUserAtom)
  const [authenticated, setAuthenticated] = useAtom(mobileAuthenticatedAtom)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const restoredRef = useRef(false)

  // Restore session on mount
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    const restore = async () => {
      try {
        const token = await getSessionToken()
        if (token) {
          mobileApi.setSessionToken(token)
          setAuthenticated(true)
          log.debug('Session restored')
        }
      } catch (err) {
        log.logError('Failed to restore session', err)
      } finally {
        setLoading(false)
      }
    }

    restore()
  }, [setAuthenticated])

  const signIn = useCallback(
    async (googleIdToken: string) => {
      setLoading(true)
      setError(null)

      try {
        const response = await mobileApi.signInWithGoogle(googleIdToken)

        // Store the session token securely
        await setSessionToken(response.session_token)
        mobileApi.setSessionToken(response.session_token)

        const mobileUser: MobileUser = {
          userId: response.user_id,
          email: response.email,
          name: response.name,
          picture: response.picture,
        }

        setUser(mobileUser)
        setAuthenticated(true)
        log.info('Signed in successfully')
      } catch (err) {
        const message =
          err instanceof MobileApiRequestError
            ? err.message
            : 'Failed to sign in. Please try again.'
        setError(message)
        log.logError('Sign in failed', err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [setUser, setAuthenticated],
  )

  const signOut = useCallback(async () => {
    try {
      await deleteSessionToken()
      mobileApi.setSessionToken(null)
      setUser(null)
      setAuthenticated(false)
      setError(null)
      log.info('Signed out')
    } catch (err) {
      log.logError('Error during sign out', err)
    }
  }, [setUser, setAuthenticated])

  return {
    user,
    authenticated,
    loading,
    error,
    signIn,
    signOut,
  }
}
