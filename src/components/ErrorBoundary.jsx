import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-red-200 shadow-sm p-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl grid place-items-center bg-red-100 text-red-700">⚠️</div>
              <h2 className="mt-3 text-3xl font-['Playfair_Display'] text-stone-900">Algo salió mal</h2>
              <p className="mt-1 text-stone-600">Ha ocurrido un error inesperado en la aplicación.</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
              >
                Recargar página
              </button>
              {import.meta.env.DEV && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-stone-500">Detalles del error (desarrollo)</summary>
                  <pre className="mt-2 text-xs bg-stone-100 p-2 rounded overflow-auto">
                    {this.state.error && this.state.error.toString()}
                    <br />
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;