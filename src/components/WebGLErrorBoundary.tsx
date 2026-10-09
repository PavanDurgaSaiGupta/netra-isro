import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  errorMessage: string
}

export default class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || '3D WebGL context error' }
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.warn('NETRA 3D Canvas error caught by WebGLErrorBoundary:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          role="region"
          aria-label="3D rendering fallback notice"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            minHeight: '360px',
            background: 'radial-gradient(circle at center, #0b1a2e 0%, #05070a 85%)',
            color: '#e6edf3',
            textAlign: 'center',
            padding: '24px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: '2px dashed #ff6b1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              background: 'rgba(255, 107, 26, 0.08)',
              boxShadow: '0 0 24px rgba(255, 107, 26, 0.25)',
              fontSize: 32,
            }}
          >
            🛰️
          </div>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              color: '#ff6b1a',
              fontSize: 11,
              letterSpacing: '0.12em',
              marginBottom: 8,
            }}
          >
            ISRO // 2D TELEMETRY MODE ACTIVE
          </div>
          <h2 style={{ fontSize: 17, marginBottom: 8, fontWeight: 600 }}>
            3D Globe Acceleration Temporarily Limited
          </h2>
          <p
            style={{
              maxWidth: 420,
              fontSize: 13,
              color: '#8b94a3',
              lineHeight: 1.5,
              marginBottom: 20,
            }}
          >
            Your device or browser switched to low-power or non-accelerated mode. Orbital telemetry and tracking feeds remain fully operational in 2D mode.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              background: 'rgba(255, 107, 26, 0.15)',
              border: '1px solid #ff6b1a',
              color: '#ff6b1a',
              padding: '8px 16px',
              borderRadius: 4,
              fontFamily: 'ui-monospace, monospace',
              fontSize: 12,
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            RETRY 3D COCKPIT
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
