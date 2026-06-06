import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background-primary flex flex-col items-center justify-center p-6 text-foreground-primary">
          <div className="max-w-2xl w-full bg-red-950/20 border border-red-900/50 p-8 rounded-xl shadow-2xl flex flex-col items-center text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
            <h1 className="text-3xl font-black text-red-100 mb-4 tracking-wider">SYSTEM FAULT DETECTED</h1>
            <p className="text-red-400 mb-8 max-w-lg">
              A critical runtime exception occurred in the Codeva frontend rendering pipeline. 
              The error has been isolated to prevent further system instability.
            </p>
            
            <div className="w-full bg-black/60 rounded p-4 overflow-x-auto text-left border border-red-900/30 mb-8 text-xs font-mono">
              <p className="text-red-500 font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
              <pre className="text-red-400/70 whitespace-pre-wrap">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-colors"
            >
              <RefreshCcw className="w-5 h-5" /> REINITIALIZE SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}
