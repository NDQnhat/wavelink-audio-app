// frontend/src/lib/playerLogger.ts

export interface PlayerLogEntry {
  timestamp: string;
  timeMs: number;
  instanceId: string;
  action: string;
  reason?: string;
  desiredRate?: number;
  confirmedRate?: number;
  playerState?: string;
  currentTime?: number;
  details?: Record<string, unknown>;
}

class PlayerLogger {
  private logs: PlayerLogEntry[] = [];
  private enabled: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const debugStorage = localStorage.getItem('debug_audio') === 'true' || localStorage.getItem('debug_player') === 'true';
        const debugWindow = Boolean((window as any).__DEBUG_PLAYER__);
        this.enabled = debugStorage || debugWindow;
      } catch {
        this.enabled = false;
      }
    }
  }

  isEnabled(): boolean {
    if (typeof window !== 'undefined' && (window as any).__DEBUG_PLAYER__) {
      return true;
    }
    return this.enabled;
  }

  enable() {
    this.enabled = true;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('debug_audio', 'true');
      } catch {}
    }
    console.log('🎵 [PlayerLogger] Logging enabled.');
  }

  disable() {
    this.enabled = false;
    this.clear();
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('debug_audio');
        localStorage.removeItem('debug_player');
      } catch {}
    }
    console.log('🎵 [PlayerLogger] Logging disabled to save resources.');
  }

  log(entry: Omit<PlayerLogEntry, 'timestamp' | 'timeMs'>) {
    if (!this.isEnabled()) return;

    const fullEntry: PlayerLogEntry = {
      timestamp: new Date().toISOString().substring(11, 23),
      timeMs: Math.round(performance.now()),
      ...entry,
    };
    this.logs.push(fullEntry);
    if (this.logs.length > 200) this.logs.shift();

    const stateStr = entry.playerState ? `[State: ${entry.playerState}]` : '';
    const rateStr = entry.desiredRate ? `[Desired: ${entry.desiredRate}x | Confirmed: ${entry.confirmedRate ?? '?'}x]` : '';
    const reasonStr = entry.reason ? `(Reason: ${entry.reason})` : '';
    console.log(
      `%c🎵 [${fullEntry.timestamp}] [${entry.instanceId}] ${entry.action} ${stateStr} ${rateStr} ${reasonStr}`,
      'color: #00bcd4; font-weight: bold;',
      entry.details || ''
    );
  }

  getLogs(): PlayerLogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}

export const playerLogger = new PlayerLogger();

if (typeof window !== 'undefined') {
  (window as any).__playerLogger = playerLogger;
}
