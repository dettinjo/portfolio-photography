import * as migration_20261026_180157_baseline from './20261026_180157_baseline';
import * as migration_20261026_193319_phase1a_photos_series from './20261026_193319_phase1a_photos_series';

export const migrations = [
  {
    up: migration_20261026_180157_baseline.up,
    down: migration_20261026_180157_baseline.down,
    name: '20261026_180157_baseline',
  },
  {
    up: migration_20261026_193319_phase1a_photos_series.up,
    down: migration_20261026_193319_phase1a_photos_series.down,
    name: '20261026_193319_phase1a_photos_series'
  },
];
