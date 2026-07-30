import { Component } from 'react';

/**
 * A crash anywhere in the tree used to blank the whole app — the worst possible
 * failure on a phone, because there is no console to look at. This shows what
 * broke and offers a way out instead.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[UMass] render failed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 bg-bg px-6 text-center"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <h1 className="text-[22px] font-bold text-label">Something broke</h1>
        <p className="max-w-[36ch] text-[15px] leading-[21px] text-label-2">
          {error.message || String(error)}
        </p>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="ios-press-scale rounded-[12px] bg-fill px-4 py-[11px] text-[16px] font-medium text-ios-blue"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ios-press-scale rounded-[12px] bg-ios-blue px-4 py-[11px] text-[16px] font-medium text-white"
          >
            Reload
          </button>
        </div>
        <details className="max-w-full pt-2 text-left">
          <summary className="cursor-pointer text-[13px] text-label-3">Details</summary>
          <pre className="mt-2 max-h-[40vh] overflow-auto rounded-[10px] bg-card p-3 text-[11px] leading-[15px] text-label-2">
            {String(error.stack || error)}
          </pre>
        </details>
      </div>
    );
  }
}
