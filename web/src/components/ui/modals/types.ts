export type ModalPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type ModalType =
  | 'confirmation'
  | 'processing'
  | 'success'
  | 'error'
  | 'warning'
  | 'transaction'
  | 'system';

export interface ModalButton {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  loading?: boolean;
}

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  priority?: ModalPriority;
}

export interface ConfirmationProps extends BaseModalProps {
  variant?: 'neutral' | 'warning' | 'destructive';
  confirmButton: ModalButton;
  cancelButton?: ModalButton;
}

export interface ProcessingProps extends BaseModalProps {
  statusText?: string;
  progressPercent?: number; // 0 to 100
  steps?: string[];
  currentStepIndex?: number;
  estimatedSecondsLeft?: number;
}

export interface SuccessProps extends BaseModalProps {
  actionButton?: ModalButton;
  autoCloseMs?: number;
  celebrate?: boolean;
}

export interface ErrorProps extends BaseModalProps {
  errorDetails?: string;
  retryAction?: () => void;
  supportAction?: () => void;
}

export interface WarningProps extends BaseModalProps {
  impactDisclaimer?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

export type TransactionStep =
  | 'PREPARING'
  | 'AWAITING_SIGNATURE'
  | 'PENDING'
  | 'CONFIRMING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REJECTED';

export interface TransactionProps extends BaseModalProps {
  step: TransactionStep;
  txHash?: string;
  gasCost?: string;
  explorerUrl?: string;
  retryAction?: () => void;
  successAction?: () => void;
}

export interface SystemProps extends BaseModalProps {
  bulletPoints?: string[];
  actionLink?: { label: string; href: string };
  forceAcknowledge?: boolean;
}

export interface ModalInstance {
  id: string;
  type: ModalType;
  priority: ModalPriority;
  props: any;
}
