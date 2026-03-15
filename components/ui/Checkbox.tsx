import * as React from 'react';
import { cn } from '@lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({ className, onCheckedChange, onChange, ...props }: CheckboxProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    if (typeof onCheckedChange === 'function') {
      onCheckedChange(event.target.checked);
    }
  };

  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500',
        className
      )}
      onChange={handleChange}
      {...props}
    />
  );
}
