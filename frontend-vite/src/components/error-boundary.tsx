import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-time errors in the subtree so a single page crash does not
 * blank the entire app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          minHeight: '60vh',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>页面出错了</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 480 }}>
          {this.state.error?.message || '发生了未知错误，请重试。'}
        </div>
        <button className="btn btn-primary btn-sm" onClick={this.handleReset}>
          重试
        </button>
      </div>
    );
  }
}
