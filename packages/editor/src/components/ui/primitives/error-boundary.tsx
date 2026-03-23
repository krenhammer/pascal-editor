'use client'

import React, {
  Component,
  createRef,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
} from 'react'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  /**
   * Static reference to the most recently mounted ErrorBoundary instance.
   * This allows external code to reset the error boundary without prop drilling.
   */
  private static instanceRef: RefObject<ErrorBoundary | null> = createRef()

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public componentDidMount() {
    // Store reference to this instance for external access
    ;(ErrorBoundary.instanceRef as React.MutableRefObject<ErrorBoundary | null>).current = this
  }

  public componentWillUnmount() {
    // Clear reference when unmounting
    if (ErrorBoundary.instanceRef.current === this) {
      ;(ErrorBoundary.instanceRef as React.MutableRefObject<ErrorBoundary | null>).current = null
    }
  }

  /**
   * Resets the error boundary state, allowing children to render again.
   * This can be called externally via ErrorBoundary.resetErrorBoundary()
   */
  public resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null }, () => {
      this.props.onReset?.()
    })
  }

  /**
   * Static method to reset the currently mounted error boundary from anywhere.
   * Useful when loading new scenes that should clear previous render errors.
   */
  public static resetErrorBoundary() {
    ErrorBoundary.instanceRef.current?.resetErrorBoundary()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#1b1c1f] p-4 text-white">
          <h2 className="mb-4 font-bold text-red-400 text-xl">Something went wrong</h2>
          <pre className="max-w-full overflow-auto rounded bg-black/30 p-4 text-gray-300 text-sm">
            {this.state.error?.message}
          </pre>
          <button
            className="mt-4 rounded bg-blue-600 px-4 py-2 hover:bg-blue-700"
            onClick={this.resetErrorBoundary}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
