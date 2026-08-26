import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="card max-w-md w-full border-red-500/20 bg-red-500/5 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-400 shrink-0" />
              <h2 className="font-semibold text-zinc-100">Something went wrong</h2>
            </div>
            {this.state.error && (
              <p className="text-xs font-mono text-zinc-500 bg-zinc-900/60 rounded p-3 break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="btn-primary text-sm"
              >
                Try again
              </button>
              <a href="/dashboard" className="btn-ghost text-sm">
                Go to dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
