import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import type { AlertType } from '../../types';

interface AlertProps {
  type?: AlertType;
  variant?: AlertType;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const alertStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  destructive: 'bg-red-50 border-red-200 text-red-800'
};

const alertIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  destructive: AlertCircle
};

export function Alert({
  type = 'info',
  variant,
  title,
  message,
  children,
  onClose,
  className
}: AlertProps) {
  const resolvedType = variant ?? type;
  const Icon = alertIcons[resolvedType];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className={clsx(
          'flex items-start p-4 border rounded-lg',
          alertStyles[resolvedType],
          className
        )}
      >
        <Icon className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          {title && <h4 className="font-medium mb-1">{title}</h4>}
          {message ? <p className="text-sm">{message}</p> : children}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function AlertDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx('text-sm text-slate-700', className)} {...props}>
      {children}
    </p>
  );
}

export default Alert;
