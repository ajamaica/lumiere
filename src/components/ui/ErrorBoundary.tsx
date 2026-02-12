import React, { Component, ErrorInfo, ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { logger } from '../../utils/logger'
import { Button } from './Button'
import { Text } from './Text'

const errorBoundaryLogger = logger.create('ErrorBoundary')

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire app.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <ChatScreen />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging in development
    if (__DEV__) {
      errorBoundaryLogger.logError('ErrorBoundary caught an error', error)
      errorBoundaryLogger.error('Component stack: ' + errorInfo.componentStack)
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <View
          style={styles.container}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel="Something went wrong. An unexpected error occurred. Please try again."
        >
          <Text variant="heading2" style={styles.title}>
            Something went wrong
          </Text>
          <Text color="secondary" center style={styles.message}>
            An unexpected error occurred. Please try again.
          </Text>
          {__DEV__ && this.state.error && (
            <Text color="secondary" style={styles.errorDetail}>
              {this.state.error.message}
            </Text>
          )}
          <Button title="Try Again" onPress={this.handleRetry} style={styles.button} />
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 12,
  },
  message: {
    marginBottom: 24,
  },
  errorDetail: {
    marginBottom: 24,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  button: {
    minWidth: 120,
  },
})
