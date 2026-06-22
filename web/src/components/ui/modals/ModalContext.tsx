'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ModalInstance, ModalType, ModalPriority } from './types';

interface ModalContextType {
  modals: ModalInstance[];
  openModal: (type: ModalType, props: any, priority?: ModalPriority) => string;
  closeModal: (id?: string) => void;
  replaceModal: (id: string, type: ModalType, props: any, priority?: ModalPriority) => void;
  clearAll: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState<ModalInstance[]>([]);

  const openModal = useCallback(
    (type: ModalType, props: any, priority: ModalPriority = 'P2') => {
      // 1. Deduplication: Check if an identical modal is already open
      const isDuplicate = modals.some(
        (m) => m.type === type && m.props.title === props.title && m.props.message === props.message
      );
      if (isDuplicate) {
        // Return existing modal id or generic
        const match = modals.find((m) => m.type === type && m.props.title === props.title);
        return match ? match.id : '';
      }

      const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newInstance: ModalInstance = { id, type, priority, props };

      setModals((prev) => {
        // Sort stack by priority if needed: P0 critical always goes to the top (renders on top)
        const updated = [...prev];
        if (priority === 'P0') {
          // Put P0 at the end (top of stack)
          updated.push(newInstance);
        } else if (priority === 'P1') {
          // Put P1 above P2/P3 but below P0
          const firstP0Index = updated.findIndex((m) => m.priority === 'P0');
          if (firstP0Index !== -1) {
            updated.splice(firstP0Index, 0, newInstance);
          } else {
            updated.push(newInstance);
          }
        } else {
          // Standard push for P2 and P3
          updated.push(newInstance);
        }
        return updated;
      });

      return id;
    },
    [modals]
  );

  const closeModal = useCallback((id?: string) => {
    setModals((prev) => {
      if (prev.length === 0) return prev;
      // If no ID is specified, close the topmost modal (the last element in the array)
      if (!id) {
        const target = prev[prev.length - 1];
        if (target.props.onClose) {
          try { target.props.onClose(); } catch (e) { console.error(e); }
        }
        return prev.slice(0, -1);
      }
      // Otherwise, close the specified modal by ID
      const target = prev.find((m) => m.id === id);
      if (target && target.props.onClose) {
        try { target.props.onClose(); } catch (e) { console.error(e); }
      }
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const replaceModal = useCallback(
    (id: string, type: ModalType, props: any, priority: ModalPriority = 'P2') => {
      setModals((prev) => {
        return prev.map((m) => {
          if (m.id === id) {
            return { id, type, priority, props };
          }
          return m;
        });
      });
    },
    []
  );

  const clearAll = useCallback(() => {
    setModals((prev) => {
      prev.forEach((m) => {
        if (m.props.onClose) {
          try { m.props.onClose(); } catch (e) { console.error(e); }
        }
      });
      return [];
    });
  }, []);

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal, replaceModal, clearAll }}>
      {children}
      {/* Modal Container will render portals here inside our layout root */}
      <ModalContainer />
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

// Internal Modal Container to render portals based on active stack
function ModalContainer() {
  const { modals, closeModal } = useModal();
  if (modals.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {modals.map((modal, index) => {
        const isTop = index === modals.length - 1;
        return (
          <ModalPortal
            key={modal.id}
            modal={modal}
            isTop={isTop}
            onClose={() => closeModal(modal.id)}
          />
        );
      })}
    </div>
  );
}

// Forward declarations for imports (portal rendering)
import { ModalPortal } from './ModalPortal';
