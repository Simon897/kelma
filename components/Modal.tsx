"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./Icons";

/** Native <dialog>: focus trap, Esc to close and an inert background for free. */
export function Modal({
  open,
  onClose,
  title,
  closeLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
      aria-labelledby="modal-title"
      className="stone m-auto w-[min(26rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-tile border-2 border-ink bg-limestone-50 p-0 text-ink shadow-block"
    >
      <div className="relative px-5 pb-6 pt-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="modal-title" className="display-caps pt-2 text-xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-tile text-ink hover:bg-limestone-200"
          >
            <CloseIcon className="size-6" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
