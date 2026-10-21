// Types locaux au feature Studio
// Les types partagés (ConvertedPage, JobSnapshot…) restent dans lib/studioApi.ts

export type Phase = 'idle' | 'config' | 'final_conversion' | 'uploading' | 'converting' | 'done' | 'error';

export type ProgressState = {
  percent: number;
  step: string;
  message: string;
};

export type ProjectMetadata = {
  title: string;
  subtitle: string;
  destFolder: string;
};

