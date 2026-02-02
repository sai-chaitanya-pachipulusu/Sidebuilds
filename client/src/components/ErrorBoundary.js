import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-white uppercase">Error</h1>
            <p className="text-gray-500 font-mono">Something unexpected happened.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white text-black font-bold uppercase border-2 border-white hover:bg-transparent hover:text-white transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
