import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'yellow' | 'teal' | 'red' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'default',
  size = 'md',
  disabled,
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white text-black hover:bg-gray-100',
    primary: 'btn-comic-primary',
    yellow: 'btn-comic-yellow',
    teal: 'btn-comic-teal',
    red: 'btn-comic-red',
    purple: 'btn-comic-purple',
  };

  const sizeStyles = {
    sm: 'text-xs py-1 px-2.5',
    md: 'text-xs md:text-sm py-2 px-3.5',
    lg: 'text-sm md:text-base py-3 px-5',
  };

  return (
    <button
      className={cn('btn-comic', variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
