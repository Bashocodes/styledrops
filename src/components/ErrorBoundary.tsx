import React from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Send error to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', true);
      scope.setContext('errorInfo', errorInfo);
      Sentry.captureException(error);
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-matte-300 via-dark-matte-400 to-dark-matte-300 font-inter flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
        <div className="w-16 h-16 bg-red-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-4">
          Something went wrong
        </h2>
        
        <p className="text-gray-400 mb-6 leading-relaxed">
          We've encountered an unexpected error. Our team has been notified and is working on a fix.
        </p>
        
        {import.meta.env.DEV && error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-left">
            <p className="text-red-300 text-sm font-mono break-all">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetError}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-lg border border-purple-400/30 hover:from-purple-500/30 hover:to-blue-500/30 hover:border-purple-400/50 transition-all duration-300 text-white"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 text-gray-300 hover:text-white"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};

// Create a Sentry-wrapped version of the ErrorBoundary
const SentryErrorBoundary = Sentry.withErrorBoundary(ErrorBoundary, {
  fallback: DefaultErrorFallback,
  showDialog: false,
});

export { ErrorBoundary, SentryErrorBoundary };
export default SentryErrorBoundary;