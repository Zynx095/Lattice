import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from './Button'

interface Props {
  children: ReactNode
  /** Rendered instead of the default message. Pass null to fail silently (decorative content). */
  fallback?: ReactNode
  /** Change this value to clear the error, e.g. the current pathname. */
  resetKey?: string
  onError?: (error: Error) => void
}

interface State {
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
    this.props.onError?.(error)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: undefined })
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback !== undefined) return this.props.fallback

    return (
      <div className="panel mx-auto mt-10 max-w-md p-6 text-center" role="alert">
        <TriangleAlert className="mx-auto mb-3 h-6 w-6 text-warning" />
        <p className="font-medium">This page stopped working</p>
        <p className="mt-1 break-words text-sm text-muted-foreground">{this.state.error.message || 'An unexpected error occurred.'}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => this.setState({ error: undefined })}>Try again</Button>
          <Button variant="ghost" onClick={() => window.location.reload()}>Reload the app</Button>
        </div>
      </div>
    )
  }
}
