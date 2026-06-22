export interface InterpretedError {
  title: string;
  message: string;
  category: 'wallet' | 'network' | 'blockchain' | 'auth' | 'unknown';
  canRetry: boolean;
  actionText?: string;
}

export function interpretError(rawError: any): InterpretedError {
  if (!rawError) {
    return {
      title: 'Unexpected Failure',
      message: 'An unknown system exception has occurred. Please try again.',
      category: 'unknown',
      canRetry: true,
    };
  }

  const message = typeof rawError === 'string'
    ? rawError
    : rawError.message || rawError.error || 'Unknown error';

  const lowerMessage = message.toLowerCase();

  // 1. Wallet Actions & Rejections
  if (
    lowerMessage.includes('user rejected') ||
    lowerMessage.includes('user denied') ||
    lowerMessage.includes('rejected transaction') ||
    lowerMessage.includes('transaction rejected') ||
    lowerMessage.includes('action rejected')
  ) {
    return {
      title: 'Transaction Cancelled',
      message: 'You declined to sign the transaction in your wallet. If this was an accident, please try again.',
      category: 'wallet',
      canRetry: true,
      actionText: 'Retry Transaction',
    };
  }

  // 2. Network & HTTP status codes
  if (lowerMessage.includes('429') || lowerMessage.includes('too many requests')) {
    return {
      title: 'Too Many Requests',
      message: 'The rate limit has been exceeded. Please wait a few moments before submitting again.',
      category: 'network',
      canRetry: false,
    };
  }
  if (lowerMessage.includes('500') || lowerMessage.includes('internal server error')) {
    return {
      title: 'Service Temporarily Offline',
      message: 'Our coordinators are experiencing high latency. Your request was saved. Please verify status shortly.',
      category: 'network',
      canRetry: true,
    };
  }
  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized') || lowerMessage.includes('jwt expired')) {
    return {
      title: 'Session Expired',
      message: 'Your cryptographic login session has expired. Please authenticate via your wallet connector again.',
      category: 'auth',
      canRetry: false,
      actionText: 'Re-authenticate',
    };
  }

  // 3. Smart Contract / On-Chain Reverts
  if (lowerMessage.includes('insufficient funds') || lowerMessage.includes('exceeds balance')) {
    return {
      title: 'Insufficient Balance',
      message: 'You do not have enough USDC/EURC on this chain to cover the payment amount and network gas fees.',
      category: 'blockchain',
      canRetry: true,
      actionText: 'Refill Wallet',
    };
  }
  if (lowerMessage.includes('not active') || lowerMessage.includes('inactive escrow')) {
    return {
      title: 'Escrow Already Settled',
      message: 'This escrow job is no longer active. It may have already been released, refunded, or disputed by the escrow manager.',
      category: 'blockchain',
      canRetry: false,
    };
  }
  if (lowerMessage.includes('deadline') || lowerMessage.includes('escrow expired')) {
    return {
      title: 'Escrow Deadline Passed',
      message: 'The lock deadline has passed. The buyer is now eligible to claim a full timeout refund.',
      category: 'blockchain',
      canRetry: false,
    };
  }
  if (lowerMessage.includes('allowance') || lowerMessage.includes('approve usdc')) {
    return {
      title: 'Allowance Inadequate',
      message: 'The token spending limit approved on-chain is too low. Please sign the approval request first.',
      category: 'blockchain',
      canRetry: true,
      actionText: 'Increase Allowance',
    };
  }

  // 4. Default Unknown Fallback
  return {
    title: 'Operation Failed',
    message: message.length > 180 ? `${message.substring(0, 180)}...` : message,
    category: 'unknown',
    canRetry: true,
  };
}
