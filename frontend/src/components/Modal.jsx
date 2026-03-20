import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// Full class strings must be static so Tailwind includes them at build time.
// Never use template literals like `sm:${variable}` — Tailwind can't detect them.
const SIZE_CLASSES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (!isOpen) return;

    // Keyboard close
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);

    // Lock body scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, centered card on sm+ */}
      <div
        className={`
          relative bg-white w-full ${sizeClass}
          rounded-t-2xl sm:rounded-2xl
          shadow-2xl
          max-h-[92vh] sm:max-h-[88vh]
          flex flex-col
          transition-transform duration-300
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — visible on mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900 leading-snug pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 overscroll-contain">
          {children}
        </div>

        {/* Footer — stacks on very small screens */}
        {footer && (
          <div className="
            px-5 py-4 border-t border-slate-100 flex-shrink-0
            bg-slate-50 rounded-b-2xl
            flex flex-col-reverse gap-2
            sm:flex-row sm:items-center sm:justify-end sm:gap-3
          ">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
