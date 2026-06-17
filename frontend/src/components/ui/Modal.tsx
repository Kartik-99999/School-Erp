"use client";
import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 max-sm:p-0">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative bg-surface-card rounded-card shadow-modal w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in",
          "max-sm:rounded-none max-sm:max-w-none max-sm:h-full max-sm:max-h-full",
          className
        )}
      >
        {(title || description) && (
          <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && <h3 className="text-base font-semibold text-ink">{title}</h3>}
              {description && <p className="text-sm text-ink-muted mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-ink-faint hover:text-ink p-1 rounded-btn hover:bg-surface transition-colors shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-6 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
