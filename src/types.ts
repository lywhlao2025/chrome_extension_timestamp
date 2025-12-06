// Shared types across components and services.
export type Source = "timestamp" | "row";

export type TimezoneEntry = {
  id: string;
  label: string;
  offsetMinutes: number;
  editableOffset: boolean;
};

export type HighlightState = {
  timestamp: boolean;
  rows: string[];
};
