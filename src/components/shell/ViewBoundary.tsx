import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ViewBoundaryProps {
  children: ReactNode
}

interface ViewBoundaryState {
  error: Error | null
}

/**
 * Route-level safety net: all views are React.lazy chunks, so a failed chunk load
 * (stale hashed chunks after a redeploy) or any render-time throw previously blanked
 * the whole app. This boundary keeps the failure contained with a retry path.
 */
export default class ViewBoundary extends Component<ViewBoundaryProps, ViewBoundaryState> {
  state: ViewBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ViewBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('View crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="view-error" role="alert">
          <span className="hud-text view-error__code">SIGNAL LOST — VIEW CRASHED</span>
          <p className="view-error__detail">{this.state.error.message}</p>
          <button className="view-error__retry" onClick={() => this.setState({ error: null })}>
            RETRY UPLINK
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
