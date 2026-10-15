import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'sm';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  size = 'default',
  interactive = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        size === 'sm' ? 'card-comic-sm' : 'card-comic',
        interactive && 'card-comic-interactive',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
