import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import type { AlertType } from '../../types';

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

const alertStyles = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800'
};

const alertIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle
};

export default function Alert({
  type,
  title,
  message,
  onClose,
  className
}: AlertProps) {
  const Icon = alertIcons[type];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className={clsx(
          'flex items-start p-4 border rounded-lg',
          alertStyles[type],
          className
        )}
      >
        <Icon className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          {title && (
            <h4 className="font-medium mb-1">{title}</h4>
          )}
          <p className="text-sm">{message}</p>
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