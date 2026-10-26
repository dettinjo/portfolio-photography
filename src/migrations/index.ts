import * as migration_20261026_180157_baseline from './20261026_180157_baseline';

export const migrations = [
  {
    up: migration_20261026_180157_baseline.up,
    down: migration_20261026_180157_baseline.down,
    name: '20261026_180157_baseline'
  },
];
