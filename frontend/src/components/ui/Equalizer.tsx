import React from 'react';
import { cn } from '@/lib/utils';

export interface EqualizerProps {
  isPlaying?: boolean;
  barColor?: string;
  className?: string;
}

export const Equalizer: React.FC<EqualizerProps> = ({ isPlaying = true, barColor, className }) => {
  return (
    <div className={cn('comic-eq-container', className)}>
      <div
        className={cn('comic-eq-bar', barColor)}
        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
      />
      <div
        className={cn('comic-eq-bar', barColor)}
        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
      />
      <div
        className={cn('comic-eq-bar', barColor)}
        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
      />
      <div
        className={cn('comic-eq-bar', barColor)}
        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
      />
      <div
        className={cn('comic-eq-bar', barColor)}
        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
      />
    </div>
  );
};
