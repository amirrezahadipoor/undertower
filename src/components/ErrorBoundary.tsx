import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Called when the user asks for a fresh start after a crash. */
  onReset?: () => void;
  label?: string;
}

interface State {
  error: Error | null;
  info: string;
}

/**
 * Last line of defence. If any subtree throws during render, the player sees a
 * recoverable card instead of a black screen — and a saved run stays intact.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info: info.componentStack ?? '' });
    console.error('[ErrorBoundary]', error, info);
  }

  private reset = () => {
    this.setState({ error: null, info: '' });
    this.props.onReset?.();
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div dir="rtl" className="flex min-h-dvh items-center justify-center bg-[#04050c] p-5">
        <div className="w-full max-w-md rounded-2xl border border-rose-400/30 bg-[#0b1020] p-5 text-right shadow-2xl">
          <h1 className="text-lg font-black text-rose-200">یک خطای ناگهانی رخ داد</h1>
          <p className="mt-2 text-[13px] leading-6 text-slate-300">
            {this.props.label ?? 'بازی'} با مشکلی روبه‌رو شد. دورِ در حال اجرا ذخیره شده است و می‌توانی از همان‌جا ادامه بدهی.
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-black/60 p-3 text-left text-[10px] leading-4 text-rose-300/80" dir="ltr">
            {error.message}
            {import.meta.env.DEV && info ? `\n${info}` : ''}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="mobile-touch min-h-11 flex-1 rounded-xl border border-cyan-300/60 bg-cyan-400/15 px-4 text-sm font-black text-cyan-100"
            >
              تلاشِ دوباره
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mobile-touch min-h-11 flex-1 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-bold text-slate-200"
            >
              بارگذاریِ دوباره
            </button>
          </div>
        </div>
      </div>
    );
  }
}
