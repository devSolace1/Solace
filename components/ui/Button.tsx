import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { ButtonVariant, ButtonSize } from '../../types';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent'
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
        />
      )}
      {children}
    </motion.button>
  );
}