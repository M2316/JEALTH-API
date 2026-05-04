-- Purpose: wipe all user workout records + user-created exercises + user accounts,
-- leaving only the 80 system-provided default exercises (isDefault = true).
-- Run inside a transaction; nothing commits until COMMIT succeeds.
--
-- Safe order (respecting FK constraints):
--   1. workout_sets, workout_exercises, workout_routines   — TRUNCATE CASCADE clears records + resets ids
--   2. exercises WHERE isDefault = false                   — exercise_muscle_groups cascades automatically
--   3. users                                                — safe once no exercise references users.id
--
-- After COMMIT: restart the api container so SeedService re-verifies the 80 defaults.

BEGIN;

-- Pre-check: how many rows will we impact?
SELECT
  (SELECT COUNT(*) FROM workout_sets)                                       AS sets_before,
  (SELECT COUNT(*) FROM workout_exercises)                                  AS wex_before,
  (SELECT COUNT(*) FROM workout_routines)                                   AS routines_before,
  (SELECT COUNT(*) FROM exercises WHERE "isDefault" = false)                AS user_exercises_before,
  (SELECT COUNT(*) FROM exercises WHERE "isDefault" = true)                 AS default_exercises_before,
  (SELECT COUNT(*) FROM users)                                              AS users_before;

TRUNCATE TABLE
  workout_sets,
  workout_exercises,
  workout_routines
RESTART IDENTITY CASCADE;

DELETE FROM exercises WHERE "isDefault" = false;

DELETE FROM users;

-- Post-check: confirm only 80 default exercises remain, everything else empty.
SELECT
  (SELECT COUNT(*) FROM exercises WHERE "isDefault" = true)   AS defaults_remaining,
  (SELECT COUNT(*) FROM exercises WHERE "isDefault" = false)  AS user_exercises_remaining,
  (SELECT COUNT(*) FROM workout_routines)                     AS routines_remaining,
  (SELECT COUNT(*) FROM workout_exercises)                    AS wex_remaining,
  (SELECT COUNT(*) FROM workout_sets)                         AS sets_remaining,
  (SELECT COUNT(*) FROM users)                                AS users_remaining,
  (SELECT COUNT(*) FROM muscle_groups)                        AS muscle_groups;

-- If the counts above look right (defaults_remaining = 80, everything else = 0,
-- muscle_groups = 6), execute COMMIT. Otherwise run ROLLBACK.
COMMIT;
