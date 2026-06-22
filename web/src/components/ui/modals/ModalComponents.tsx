'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  XCircle,
  X,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  ConfirmationProps,
  ProcessingProps,
  SuccessProps,
  ErrorProps,
  WarningProps,
  TransactionProps,
  SystemProps,
} from './types';

// Close Button Helper
function HeaderCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors p-1"
      aria-label="Close modal"
    >
      <X className="w-5 h-5" />
    </button>
  );
}

// 1. Confirmation Modal Component
export function ConfirmationModal({
  title,
  message,
  variant = 'neutral',
  confirmButton,
  cancelButton,
  onClose,
}: ConfirmationProps) {
  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <XCircle className="w-6 h-6 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-400" />;
      default:
        return <ShieldAlert className="w-6 h-6 text-cyan-400" />;
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'destructive':
        return 'border-red-500/30 bg-red-500/5';
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/5';
      default:
        return 'border-cyan-500/30 bg-cyan-500/5';
    }
  };

  return (
    <div className="relative">
      <HeaderCloseButton onClose={onClose} />
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg border ${getBorderColor()}`}>{getIcon()}</div>
        <h3 className="text-base font-semibold text-gray-100">{title}</h3>
      </div>
      {message && <p className="text-gray-400 text-xs leading-relaxed mb-6">{message}</p>}

      <div className="flex justify-end gap-3">
        {cancelButton && (
          <button
            onClick={cancelButton.onClick}
            className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 rounded-xl text-xs font-medium transition-all"
          >
            {cancelButton.label}
          </button>
        )}
        <button
          onClick={confirmButton.onClick}
          disabled={confirmButton.loading}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            variant === 'destructive'
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20'
              : variant === 'warning'
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20'
          }`}
        >
          {confirmButton.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {confirmButton.label}
        </button>
      </div>
    </div>
  );
}

// 2. Processing Modal Component
export function ProcessingModal({
  title,
  message,
  statusText = 'Processing request...',
  progressPercent,
  steps,
  currentStepIndex = 0,
}: ProcessingProps) {
  return (
    <div className="text-center py-4">
      <div className="flex justify-center mb-5">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <Loader2 className="w-5 h-5 text-cyan-400 absolute animate-pulse" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-gray-100 mb-2">{title}</h3>
      {message && <p className="text-gray-400 text-xs mb-5 leading-relaxed">{message}</p>}

      {/* Optional Progress Bar */}
      {progressPercent !== undefined && (
        <div className="w-full bg-gray-900 rounded-full h-1.5 mb-4 overflow-hidden border border-gray-800">
          <div
            className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Optional Step Indicators */}
      {steps && steps.length > 0 && (
        <div className="mt-6 text-left border-t border-gray-900/80 pt-4 space-y-2.5 max-w-xs mx-auto">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            return (
              <div key={idx} className="flex items-center gap-2.5 text-xs">
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-gray-800 shrink-0 flex items-center justify-center text-[9px] text-gray-600">
                    {idx + 1}
                  </div>
                )}
                <span
                  className={
                    isCompleted
                      ? 'text-gray-400 line-through'
                      : isActive
                      ? 'text-cyan-400 font-semibold'
                      : 'text-gray-600'
                  }
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-gray-500 italic mt-6">{statusText}</p>
    </div>
  );
}

// 3. Success Modal Component
export function SuccessModal({
  title,
  message,
  actionButton,
  onClose,
}: SuccessProps) {
  return (
    <div className="text-center py-4">
      <HeaderCloseButton onClose={onClose} />
      <div className="flex justify-center mb-5">
        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 flex items-center justify-center animate-bounce">
          <CheckCircle className="w-6 h-6" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-gray-100 mb-2">{title}</h3>
      {message && <p className="text-gray-400 text-xs leading-relaxed mb-6 max-w-sm mx-auto">{message}</p>}

      {actionButton ? (
        <button
          onClick={actionButton.onClick}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold py-3 rounded-xl transition-all text-xs"
        >
          {actionButton.label}
        </button>
      ) : (
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 font-medium rounded-xl transition-all text-xs"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

// 4. Error Modal Component
export function ErrorModal({
  title,
  message,
  errorDetails,
  retryAction,
  supportAction,
  onClose,
}: ErrorProps) {
  return (
    <div>
      <HeaderCloseButton onClose={onClose} />
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
          <XCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-100">{title}</h3>
      </div>
      {message && <p className="text-gray-400 text-xs leading-relaxed mb-4">{message}</p>}

      {errorDetails && (
        <pre className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-[10px] text-red-400 overflow-x-auto max-h-[120px] font-mono mb-6 leading-normal">
          {errorDetails}
        </pre>
      )}

      <div className="flex gap-2.5">
        {supportAction && (
          <button
            onClick={supportAction}
            className="flex-1 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 rounded-xl text-xs transition-all"
          >
            Support Info
          </button>
        )}
        {retryAction ? (
          <button
            onClick={retryAction}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1 transition-all shadow-lg shadow-red-950/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        ) : (
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-850 text-gray-300 rounded-xl text-xs transition-all text-center"
          >
            Acknowledge
          </button>
        )}
      </div>
    </div>
  );
}

// 5. Warning Modal Component
export function WarningModal({
  title,
  message,
  impactDisclaimer = 'This action cannot be undone and has permanent state changes.',
  confirmLabel = 'Proceed Anyway',
  onConfirm,
  onClose,
}: WarningProps) {
  const [loading, setLoading] = React.useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <HeaderCloseButton onClose={onClose} />
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 animate-pulse">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-100">{title}</h3>
      </div>
      {message && <p className="text-gray-400 text-xs leading-relaxed mb-4">{message}</p>}

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 mb-6">
        <p className="text-[10px] text-amber-400 font-medium leading-relaxed">{impactDisclaimer}</p>
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 rounded-xl text-xs transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-950/20"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

// 6. Transaction Modal Component
export function TransactionModal({
  title,
  step,
  txHash,
  gasCost,
  explorerUrl,
  retryAction,
  successAction,
  onClose,
}: TransactionProps) {
  const getStepStatus = () => {
    switch (step) {
      case 'PREPARING':
        return { label: 'Preparing Transaction', desc: 'Validating balances and calculating network fee options...', color: 'text-cyan-400' };
      case 'AWAITING_SIGNATURE':
        return { label: 'Awaiting Signature', desc: 'Confirm typing challenge authorization inside your secure wallet dialog...', color: 'text-amber-400' };
      case 'PENDING':
        return { label: 'Submitting Transaction', desc: 'Sponsoring gas and forwarding pay-per-call to Arc Network...', color: 'text-purple-400' };
      case 'CONFIRMING':
        return { label: 'Confirming On-Chain', desc: 'Mining block finality. Safe and predictable execution confirmed...', color: 'text-blue-400 font-medium' };
      case 'SUCCESS':
        return { label: 'Transaction Completed', desc: 'Payment securely settled, digital escrow locked on-chain successfully!', color: 'text-emerald-400' };
      case 'FAILED':
        return { label: 'Transaction Reverted', desc: 'The smart contract reverted execution. Please inspect balance logs.', color: 'text-red-400' };
      case 'REJECTED':
        return { label: 'Authorization Rejected', desc: 'The signature verification pin failed. Please retry.', color: 'text-red-400' };
    }
  };

  const status = getStepStatus();

  return (
    <div className="space-y-5">
      <HeaderCloseButton onClose={onClose} />
      <div className="flex items-center gap-3">
        {step === 'SUCCESS' ? (
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
        ) : step === 'FAILED' || step === 'REJECTED' ? (
          <div className="p-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
            <XCircle className="w-5 h-5" />
          </div>
        ) : (
          <div className="p-2 bg-gray-900 text-cyan-400 rounded-lg border border-gray-800 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        <div>
          <h4 className="text-xs text-gray-500 uppercase font-bold tracking-wider">Transaction Tracker</h4>
          <h3 className="text-base font-semibold text-gray-100">{title}</h3>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-850/60 rounded-xl p-4 space-y-3 text-xs leading-relaxed">
        <div>
          <p className={`font-semibold ${status.color}`}>{status.label}</p>
          <p className="text-[11px] text-gray-400 mt-1">{status.desc}</p>
        </div>

        {gasCost && (
          <div className="flex justify-between text-[11px] pt-2 border-t border-gray-800/40">
            <span className="text-gray-500">Estimated Gas Fee:</span>
            <span className="font-mono text-gray-300">{gasCost} USDC (Sponsored)</span>
          </div>
        )}

        {txHash && (
          <div className="flex justify-between text-[11px] pt-1.5">
            <span className="text-gray-500">Tx Hash:</span>
            <span className="font-mono text-cyan-500 truncate max-w-[120px]" title={txHash}>
              {txHash}
            </span>
          </div>
        )}
      </div>

      {txHash && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
        >
          View on Block Explorer
          <ExternalLink className="w-3 h-3" />
        </a>
      )}

      <div className="flex gap-2.5 pt-2">
        {(step === 'FAILED' || step === 'REJECTED') && retryAction && (
          <button
            onClick={retryAction}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-red-900/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Transaction
          </button>
        )}
        {step === 'SUCCESS' && successAction ? (
          <button
            onClick={successAction}
            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl text-xs transition-all"
          >
            Continue Workflow
          </button>
        ) : (
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 font-medium rounded-xl text-xs transition-all"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

// 7. System Modal Component
export function SystemModal({
  title,
  message,
  bulletPoints,
  actionLink,
  forceAcknowledge = false,
  onClose,
}: SystemProps) {
  return (
    <div className="space-y-4">
      {!forceAcknowledge && <HeaderCloseButton onClose={onClose} />}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-xs text-gray-500 uppercase font-bold tracking-wider">System Announcement</h4>
          <h3 className="text-base font-semibold text-gray-100">{title}</h3>
        </div>
      </div>

      {message && <p className="text-gray-400 text-xs leading-relaxed">{message}</p>}

      {bulletPoints && bulletPoints.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-gray-400 space-y-1.5 leading-relaxed">
          {bulletPoints.map((pt, idx) => (
            <li key={idx}>{pt}</li>
          ))}
        </ul>
      )}

      {actionLink && (
        <div className="pt-2">
          <a
            href={actionLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            {actionLink.label}
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      )}

      <div className="pt-4 border-t border-gray-900/60">
        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all text-xs"
        >
          Acknowledge Announcement
        </button>
      </div>
    </div>
  );
}
