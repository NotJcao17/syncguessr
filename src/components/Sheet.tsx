"use client";

import { ReactNode, useEffect, useRef } from "react";
import { Icon } from "./Icon";

/** Bottom sheet on phones, centered dialog from `sm` up. Escape and the backdrop close it. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-fade cursor-default bg-night-deep/80"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-xl animate-rise flex-col rounded-t-[28px] bg-surface shadow-[0_-20px_60px_-20px_oklch(0_0_0/0.8)] outline-none sm:rounded-[28px]"
      >
        <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
          <h2 className="text-xl">{title}</h2>
          <button type="button" onClick={onClose} className="icon-btn -mr-2" aria-label="Cerrar">
            <Icon name="close" className="size-6" />
          </button>
        </header>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <footer className="border-t border-line/50 px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
