import * as migration_20261026_180157_baseline from './20261026_180157_baseline';
import * as migration_20261026_193319_phase1a_photos_series from './20261026_193319_phase1a_photos_series';
import * as migration_20261027_000000_seed_launch_genres from './20261027_000000_seed_launch_genres';

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
  {
    up: migration_20261027_000000_seed_launch_genres.up,
    down: migration_20261027_000000_seed_launch_genres.down,
    name: '20261027_000000_seed_launch_genres'
  },
];
