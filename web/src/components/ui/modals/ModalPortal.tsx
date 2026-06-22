'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ModalInstance } from './types';
import {
  ConfirmationModal,
  ProcessingModal,
  SuccessModal,
  ErrorModal,
  WarningModal,
  TransactionModal,
  SystemModal,
} from './ModalComponents';

interface ModalPortalProps {
  modal: ModalInstance;
  isTop: boolean;
  onClose: () => void;
}

export function ModalPortal({ modal, isTop, onClose }: ModalPortalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Capture previous active element on mount
  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    return () => {
      // Restore focus to trigger element on unmount
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, []);

  // Keyboard navigation listeners: Escape to close and TAB key trap
  useEffect(() => {
    if (!isTop) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. ESC key to close (unless forceAcknowledge is true on system modals)
      if (e.key === 'Escape') {
        if (modal.type === 'system' && modal.props.forceAcknowledge) {
          return;
        }
        onClose();
      }

      // 2. Focus Trap: Trap tab key within the modal
      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusableElements[0] as HTMLElement;
        const last = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTop, onClose, modal.type, modal.props.forceAcknowledge]);

  // Auto-focus the modal container or the first focusable element on mount
  useEffect(() => {
    if (modalRef.current) {
      const focusable = modalRef.current.querySelector(
        'button, [href], input, select, textarea'
      ) as HTMLElement;
      if (focusable) {
        focusable.focus();
      } else {
        modalRef.current.focus();
      }
    }
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Prevent backdrop click closing if forceAcknowledge is active
    if (modal.type === 'system' && modal.props.forceAcknowledge) {
      return;
    }
    // Only close if the click was directly on the overlay
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Render modal content depending on the type
  const renderModalContent = () => {
    switch (modal.type) {
      case 'confirmation':
        return <ConfirmationModal {...modal.props} onClose={onClose} />;
      case 'processing':
        return <ProcessingModal {...modal.props} onClose={onClose} />;
      case 'success':
        return <SuccessModal {...modal.props} onClose={onClose} />;
      case 'error':
        return <ErrorModal {...modal.props} onClose={onClose} />;
      case 'warning':
        return <WarningModal {...modal.props} onClose={onClose} />;
      case 'transaction':
        return <TransactionModal {...modal.props} onClose={onClose} />;
      case 'system':
        return <SystemModal {...modal.props} onClose={onClose} />;
      default:
        return null;
    }
  };

  // Safely mount to body portal (works fine on SSR via Next.js client-side mount checks)
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto transition-opacity duration-300 ${
        isTop ? 'opacity-100 bg-black/60 backdrop-blur-sm' : 'opacity-0 bg-transparent'
      }`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-title-${modal.id}`}
        tabIndex={-1}
        className="w-full max-w-md bg-gray-950/90 border border-gray-800/80 rounded-2xl p-6 shadow-2xl z-10 overflow-hidden outline-none animate-scale-in"
      >
        {renderModalContent()}
      </div>
    </div>,
    document.body
  );
}
