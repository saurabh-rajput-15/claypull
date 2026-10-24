import React, { Component, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ClayPull ErrorBoundary caught:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-canvas, #fffaf0)',
            padding: 24,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 500,
              background: 'var(--color-surface-card, #f5f0e0)',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <AlertCircle size={24} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#0a0a0a', marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 14, color: '#6a6a6a', lineHeight: 1.5, marginBottom: 20 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred in the application.'}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                background: '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <RotateCcw size={14} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
