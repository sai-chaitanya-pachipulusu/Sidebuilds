import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp, Copy, CheckCircle } from 'lucide-react';

// Production-ready error boundary with comprehensive error handling
class ProductionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      isReporting: false,
      reportSent: false,
      showDetails: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Production Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      timestamp: new Date().toISOString()
    });

    // Report error to monitoring service
    this.reportError(error, errorInfo);
  }

  reportError = async (error, errorInfo) => {
    try {
      this.setState({ isReporting: true });

      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id : null,
        buildVersion: process.env.REACT_APP_VERSION || 'unknown',
        environment: process.env.NODE_ENV
      };

      // Send to error reporting service
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: true,
          custom_map: {
            error_id: this.state.errorId,
            component_stack: errorInfo.componentStack
          }
        });
      }

      // Send to backend error logging
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(errorReport)
      }).catch(() => {
        // Silent fail for error reporting
        console.warn('Failed to report error to backend');
      });

      this.setState({ reportSent: true });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    } finally {
      this.setState({ isReporting: false });
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      showDetails: false
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  copyErrorDetails = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      timestamp: this.state.timestamp,
      url: window.location.href
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2)).then(() => {
      // Show success feedback
      this.setState({ copiedToClipboard: true });
      setTimeout(() => this.setState({ copiedToClipboard: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId, isReporting, reportSent, showDetails, retryCount } = this.state;
      
      // Provide fallback UI based on error type and context
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl w-full"
          >
            {/* Error Card */}
            <div className="bg-gray-900/80 backdrop-blur-sm border border-red-500/20 rounded-2xl p-8 text-center">
              {/* Error Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </motion.div>

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-white mb-2">
                Oops! Something went wrong
              </h1>
              
              <p className="text-gray-400 mb-6">
                We encountered an unexpected error. Our team has been notified and is working on a fix.
              </p>

              {/* Error ID */}
              <div className="bg-gray-800/50 rounded-lg p-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Error ID:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-white font-mono">{errorId}</code>
                    <button
                      onClick={this.copyErrorDetails}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="Copy error details"
                    >
                      {this.state.copiedToClipboard ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Reporting Status */}
              <div className="mb-6">
                {isReporting && (
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"
                    />
                    Reporting error...
                  </div>
                )}
                
                {reportSent && !isReporting && (
                  <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    Error reported successfully
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <motion.button
                  onClick={this.handleRetry}
                  className="flex-1 px-6 py-3 bg-white hover:bg-gray-200 text-black font-bold uppercase transition-colors duration-200 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again {retryCount > 0 && `(${retryCount})`}
                </motion.button>
                
                <motion.button
                  onClick={this.handleReload}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </motion.button>
                
                <motion.button
                  onClick={this.handleGoHome}
                  className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </motion.button>
              </div>

              {/* Toggle Error Details */}
              <button
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mx-auto"
              >
                <Bug className="w-4 h-4" />
                {showDetails ? 'Hide' : 'Show'} Error Details
                {showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Error Details */}
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 text-left"
                >
                  <div className="bg-gray-800/30 rounded-lg p-4 text-sm">
                    <div className="space-y-4">
                      {error && (
                        <div>
                          <h4 className="text-red-400 font-medium mb-2">Error Message:</h4>
                          <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap bg-gray-900/50 p-2 rounded">
                            {error.message}
                          </pre>
                        </div>
                      )}
                      
                      {error?.stack && (
                        <div>
                          <h4 className="text-red-400 font-medium mb-2">Stack Trace:</h4>
                          <pre className="text-gray-400 text-xs overflow-x-auto whitespace-pre-wrap bg-gray-900/50 p-2 rounded max-h-32">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      
                      {errorInfo?.componentStack && (
                        <div>
                          <h4 className="text-red-400 font-medium mb-2">Component Stack:</h4>
                          <pre className="text-gray-400 text-xs overflow-x-auto whitespace-pre-wrap bg-gray-900/50 p-2 rounded max-h-32">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Support Information */}
              <div className="mt-6 pt-6 border-t border-gray-700 text-sm text-gray-500">
                <p>
                  If this problem persists, please contact our support team with the error ID above.
                </p>
                <p className="mt-1">
                  Email: <a href="mailto:support@sidebuilds.com" className="text-white hover:underline">
                    support@sidebuilds.com
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lightweight error boundary for smaller components
export class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Something went wrong with this component</span>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ProductionErrorBoundary;
