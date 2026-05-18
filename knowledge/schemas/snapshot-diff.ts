export type SnapshotDiff = {
  id: string;

  createdAt: string;

  snapshots: {
    previous: string;
    current: string;
  };

  changes: {
    moduleCountDelta: number;
    hotspotCountDelta: number;
    invariantCountDelta: number;
    eventCountDelta: number;
  };

  signals: string[];
};