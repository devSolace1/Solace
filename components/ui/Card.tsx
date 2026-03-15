import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { CardVariant } from '../../types';

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const cardVariants = {
  default: 'bg-white border border-gray-200 shadow-sm',
  elevated: 'bg-white border border-gray-200 shadow-lg',
  bordered: 'bg-white border-2 border-gray-300',
  minimal: 'bg-gray-50 border border-gray-100'
};

export default function Card({
  variant = 'default',
  className,
  children,
  onClick
}: CardProps) {
  const Component = onClick ? motion.div : motion.div;

  const props = onClick ? {
    onClick,
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    className: clsx(
      'rounded-lg p-4 cursor-pointer transition-shadow hover:shadow-md',
      cardVariants[variant],
      className
    )
  } : {
    className: clsx(
      'rounded-lg p-4',
      cardVariants[variant],
      className
    )
  };

  return (
    <Component
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </Component>
  );
}