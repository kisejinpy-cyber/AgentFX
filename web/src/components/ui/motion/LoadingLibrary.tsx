'use client';

import React from 'react';
import { Loader2, Search, UploadCloud, DownloadCloud, AlertTriangle } from 'lucide-react';
import { useLoading } from './LoadingContext';

// 1. Core Skeleton Shimmer Base
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  const { prefersReducedMotion } = useLoading();
  return (
    <div
      style={style}
      className={`bg-gray-800/40 border border-gray-800/20 rounded-xl overflow-hidden relative before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent ${
        prefersReducedMotion ? '' : 'before:animate-[shimmer-slide_1.5s_infinite]'
      } ${className}`}
    />
  );
}

// 2. Premium Loading Button (maintains strict dimensions to prevent CLS layout shift)
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: React.ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingText,
  variant = 'primary',
  children,
  className = '',
  disabled,
  onClick,
  ...props
}: LoadingButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) onClick(e);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-900 border border-gray-800 text-gray-300 hover:bg-gray-850';
      case 'danger':
        return 'bg-red-650/15 border border-red-500/30 text-red-400 hover:bg-red-650/25';
      case 'ghost':
        return 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900';
      default:
        return 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-950/20';
    }
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-busy={loading}
      className={`relative inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl px-4 py-2.5 text-xs select-none active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${getVariantStyles()} ${className}`}
    >
      {/* Invisible placeholder of original content to maintain size */}
      <span className={`inline-flex items-center gap-1.5 ${loading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {children}
      </span>

      {/* Loading state indicator absolutely positioned */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center gap-1.5 animate-fade-in">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
          <span className="font-semibold text-[11px] uppercase tracking-wider">
            {loadingText || 'Processing...'}
          </span>
        </span>
      )}
    </button>
  );
}

// 3. Realistic Loading Card Skeleton (Zero CLS)
export function LoadingCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-gray-950/30 border border-gray-850/50 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/5" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-full" style={{ width: `${100 - i * 8}%` }} />
        ))}
      </div>
    </div>
  );
}

// 4. Loading Table Rows (stabilizes dimensions)
export function LoadingTable({ cols = 4, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <div className="border border-gray-850/50 rounded-2xl overflow-hidden bg-gray-950/20">
      <div className="bg-gray-900/40 p-4 border-b border-gray-850 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-gray-900/40">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" style={{ width: c === 0 ? '70%' : '100%' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. Input Loading Indicator
export function LoadingInput({
  loading = false,
  placeholder,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { loading?: boolean }) {
  return (
    <div className="relative w-full">
      <input
        {...props}
        placeholder={placeholder}
        disabled={loading || props.disabled}
        className={`w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 placeholder-gray-600 focus:border-cyan-500/60 focus:outline-none transition-colors disabled:opacity-60 ${className}`}
      />
      {loading && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </span>
      )}
    </div>
  );
}

// 6. Search Bar loading autocomplete wrapper
interface LoadingSearchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  loading?: boolean;
  onSearch?: (val: string) => void;
}

export function LoadingSearch({ loading = false, onSearch, className = '', ...props }: LoadingSearchProps) {
  const [val, setVal] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setVal(v);
    if (onSearch) {
      onSearch(v);
    }
  };

  return (
    <div className="relative w-full">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600">
        <Search className="w-4 h-4" />
      </span>
      <input
        {...props}
        type="text"
        value={val}
        onChange={handleChange}
        className={`w-full bg-gray-950/60 border border-gray-800/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-gray-200 placeholder-gray-500 focus:border-cyan-500/60 focus:outline-none transition-colors ${className}`}
      />
      {loading && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </span>
      )}
    </div>
  );
}

// 7. Interactive File upload / download card
interface TransferProps {
  id: string;
  name: string;
  type: 'upload' | 'download';
  onCancel?: () => void;
}

export function FileTransferPanel({ id, name, type, onCancel }: TransferProps) {
  const { transfers } = useLoading();
  const transfer = transfers[id] || { progress: 0, status: 'active' };

  if (transfer.status === 'completed') {
    return null;
  }

  return (
    <div className="border border-gray-850 bg-gray-950/80 rounded-2xl p-4 flex items-center gap-3 shadow-xl max-w-sm animate-scale-in">
      <div className={`p-2 rounded-xl ${type === 'upload' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-blue-500/10 text-blue-400'}`}>
        {type === 'upload' ? <UploadCloud className="w-5 h-5" /> : <DownloadCloud className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="text-[11px] font-medium text-gray-200 truncate">{name}</h5>
        <div className="flex justify-between items-center text-[9px] text-gray-500 mt-1 mb-1.5">
          <span>{type === 'upload' ? 'Uploading...' : 'Downloading...'}</span>
          <span>{transfer.progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden border border-gray-850">
          <div
            className={`h-full rounded-full transition-all duration-300 ${type === 'upload' ? 'bg-cyan-500' : 'bg-blue-500'}`}
            style={{ width: `${transfer.progress}%` }}
          />
        </div>
        {(transfer.speed || transfer.eta) && (
          <div className="flex gap-3 text-[8px] text-gray-600 mt-1">
            {transfer.speed && <span>Speed: {transfer.speed}</span>}
            {transfer.eta && <span>Remaining: {transfer.eta}</span>}
          </div>
        )}
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          aria-label="Cancel operation"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

// 8. Loading Area Chart Skeleton
export function LoadingChart() {
  return (
    <div className="bg-gray-950/20 border border-gray-850/50 rounded-2xl p-5 space-y-6 h-60 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-3 w-1/6" />
        </div>
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>

      {/* Simulated Chart Bars/Area Grid */}
      <div className="h-28 flex items-end gap-2.5">
        {Array.from({ length: 12 }).map((_, i) => {
          const height = [20, 45, 30, 60, 50, 75, 40, 85, 60, 95, 80, 110][i];
          return (
            <div key={i} className="flex-1 flex flex-col justify-end h-full">
              <Skeleton className="w-full rounded-t-lg bg-gray-850/40" style={{ height: `${height}px` }} />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  );
}
