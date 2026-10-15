import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'yellow' | 'blue' | 'teal' | 'red' | 'purple' | 'orange' | 'white';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'white', children, ...props }) => {
  const variantStyles = {
    yellow: 'badge-comic-yellow',
    blue: 'badge-comic-blue',
    teal: 'badge-comic-teal',
    red: 'badge-comic-red',
    purple: 'badge-comic-purple',
    orange: 'badge-comic-orange',
    white: 'badge-comic-white',
  };

  return (
    <span className={cn('badge-comic', variantStyles[variant], className)} {...props}>
      {children}
    </span>
  );
};
