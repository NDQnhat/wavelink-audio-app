export interface ProgressPayload {
  audioId: number;
  episodeId: number;
  positionSeconds: number;
  progressPercent: number;
  completed?: boolean;
}

export interface AudioProgressInfo {
  audioId: number;
  episodeId: number;
  positionSeconds: number;
  progressPercent: number;
  completed: boolean;
  updatedAt?: string;
}
