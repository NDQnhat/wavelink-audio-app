import React from 'react';
import { Button } from '@/components/ui/Button';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'ri-search-eye-line',
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="card-comic p-6 text-center flex flex-col items-center gap-3 bg-white my-3 fade-in-comic">
      <div className="w-14 h-14 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center shadow-comic">
        <i className={`${icon} text-2xl text-black`} />
      </div>
      <h3 className="font-extrabold text-base text-black uppercase">{title}</h3>
      {description && <p className="text-xs font-semibold text-gray-600 max-w-xs">{description}</p>}
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
