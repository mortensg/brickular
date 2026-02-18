import { cva } from 'class-variance-authority';

export const brickButtonVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      tone: {
        primary: 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800',
        neutral: 'bg-transparent text-slate-900 border-slate-300 hover:bg-slate-100',
      },
      size: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3 text-sm',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'md',
    },
  },
);

export const brickInputVariants = cva(
  'h-9 rounded-md border border-[var(--b-table-border,#d1d5db)] bg-[var(--b-table-bg,#fff)] px-2.5 text-sm text-[var(--b-table-fg,#111827)]',
);

export const brickBadgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-slate-100 text-slate-700',
      success: 'bg-emerald-100 text-emerald-700',
      warning: 'bg-amber-100 text-amber-800',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});
