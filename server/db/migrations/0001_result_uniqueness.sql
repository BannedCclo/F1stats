-- Uniqueness constraints needed for idempotent (ON CONFLICT DO NOTHING) population
-- from an external source. One row per driver per race/session, one
-- classification row per driver/team per championship.

ALTER TABLE results ADD CONSTRAINT results_race_driver_unique UNIQUE (race_id, driver_id);
ALTER TABLE classifications ADD CONSTRAINT classifications_race_driver_unique UNIQUE (race_id, driver_id);
ALTER TABLE sprint_race ADD CONSTRAINT sprint_race_race_driver_unique UNIQUE (race_id, driver_id);
ALTER TABLE sprint_qualy ADD CONSTRAINT sprint_qualy_race_driver_unique UNIQUE (race_id, driver_id);
ALTER TABLE fp1 ADD CONSTRAINT fp1_race_driver_unique UNIQUE (race_id, driver_id);
ALTER TABLE fp2 ADD CONSTRAINT fp2_race_driver_unique UNIQUE (race_id, driver_id);
ALTER TABLE fp3 ADD CONSTRAINT fp3_race_driver_unique UNIQUE (race_id, driver_id);
ALTER TABLE driver_classifications ADD CONSTRAINT driver_classifications_championship_driver_unique UNIQUE (championship_id, driver_id);
ALTER TABLE constructors_classifications ADD CONSTRAINT constructors_classifications_championship_team_unique UNIQUE (championship_id, team_id);
