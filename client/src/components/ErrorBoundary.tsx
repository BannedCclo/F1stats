import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time crashes (a malformed API response reaching a
 * component that doesn't expect it) so the app shows a recoverable screen
 * instead of a blank white page.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-[60svh] max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-data text-sm text-kerb">ERROR</p>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-chalk">
            Something broke
          </h1>
          <p className="text-sm text-smoke">The page hit an unexpected error. Reloading usually fixes it.</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null })
              window.location.reload()
            }}
            className="mt-2 border border-kerb px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-kerb hover:bg-kerb hover:text-chalk"
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
