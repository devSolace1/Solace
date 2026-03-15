import * as React from 'react';
import { cn } from '@lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
}

export function Progress({ className, value, max = 100, ...props }: ProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full rounded-full bg-slate-200', className)} {...props}>
      <div
        className="h-2 rounded-full bg-indigo-600"
        style={{ width: `${percent}%` }}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  );
}
