import * as migration_20261026_180157_baseline from './20261026_180157_baseline';
import * as migration_20261026_193319_phase1a_photos_series from './20261026_193319_phase1a_photos_series';
import * as migration_20261027_000000_seed_launch_genres from './20261027_000000_seed_launch_genres';
import * as migration_20261027_072532_phase2b_sessions from './20261027_072532_phase2b_sessions';
import * as migration_20261027_080000_seed_offerings from './20261027_080000_seed_offerings';
import * as migration_20261027_081131_phase2c_about from './20261027_081131_phase2c_about';
import * as migration_20261027_081500_seed_about from './20261027_081500_seed_about';
import * as migration_20261027_082634_phase3a_clients_projects from './20261027_082634_phase3a_clients_projects';
import * as migration_20261027_122531_phase3b_proofing from './20261027_122531_phase3b_proofing';
import * as migration_20261027_135102_phase3c_payments from './20261027_135102_phase3c_payments';
import * as migration_20261027_141748_phase3d_plan_messages from './20261027_141748_phase3d_plan_messages';
import * as migration_20261027_191124_phase4a_delivery from './20261027_191124_phase4a_delivery';
import * as migration_20261027_200100_phase4b_revisions from './20261027_200100_phase4b_revisions';
import * as migration_20261027_212045_phase4d_feedback_reviews from './20261027_212045_phase4d_feedback_reviews';
import * as migration_20261028_102219_phase4e_push from './20261028_102219_phase4e_push';
import * as migration_20261028_143646_phase4c_balance from './20261028_143646_phase4c_balance';

export const migrations = [
  {
    up: migration_20261026_180157_baseline.up,
    down: migration_20261026_180157_baseline.down,
    name: '20261026_180157_baseline',
  },
  {
    up: migration_20261026_193319_phase1a_photos_series.up,
    down: migration_20261026_193319_phase1a_photos_series.down,
    name: '20261026_193319_phase1a_photos_series',
  },
  {
    up: migration_20261027_000000_seed_launch_genres.up,
    down: migration_20261027_000000_seed_launch_genres.down,
    name: '20261027_000000_seed_launch_genres',
  },
  {
    up: migration_20261027_072532_phase2b_sessions.up,
    down: migration_20261027_072532_phase2b_sessions.down,
    name: '20261027_072532_phase2b_sessions',
  },
  {
    up: migration_20261027_080000_seed_offerings.up,
    down: migration_20261027_080000_seed_offerings.down,
    name: '20261027_080000_seed_offerings',
  },
  {
    up: migration_20261027_081131_phase2c_about.up,
    down: migration_20261027_081131_phase2c_about.down,
    name: '20261027_081131_phase2c_about',
  },
  {
    up: migration_20261027_081500_seed_about.up,
    down: migration_20261027_081500_seed_about.down,
    name: '20261027_081500_seed_about',
  },
  {
    up: migration_20261027_082634_phase3a_clients_projects.up,
    down: migration_20261027_082634_phase3a_clients_projects.down,
    name: '20261027_082634_phase3a_clients_projects',
  },
  {
    up: migration_20261027_122531_phase3b_proofing.up,
    down: migration_20261027_122531_phase3b_proofing.down,
    name: '20261027_122531_phase3b_proofing',
  },
  {
    up: migration_20261027_135102_phase3c_payments.up,
    down: migration_20261027_135102_phase3c_payments.down,
    name: '20261027_135102_phase3c_payments',
  },
  {
    up: migration_20261027_141748_phase3d_plan_messages.up,
    down: migration_20261027_141748_phase3d_plan_messages.down,
    name: '20261027_141748_phase3d_plan_messages',
  },
  {
    up: migration_20261027_191124_phase4a_delivery.up,
    down: migration_20261027_191124_phase4a_delivery.down,
    name: '20261027_191124_phase4a_delivery',
  },
  {
    up: migration_20261027_200100_phase4b_revisions.up,
    down: migration_20261027_200100_phase4b_revisions.down,
    name: '20261027_200100_phase4b_revisions',
  },
  {
    up: migration_20261027_212045_phase4d_feedback_reviews.up,
    down: migration_20261027_212045_phase4d_feedback_reviews.down,
    name: '20261027_212045_phase4d_feedback_reviews',
  },
  {
    up: migration_20261028_102219_phase4e_push.up,
    down: migration_20261028_102219_phase4e_push.down,
    name: '20261028_102219_phase4e_push',
  },
  {
    up: migration_20261028_143646_phase4c_balance.up,
    down: migration_20261028_143646_phase4c_balance.down,
    name: '20261028_143646_phase4c_balance'
  },
];
