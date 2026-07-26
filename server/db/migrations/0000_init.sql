-- Full schema for the F1 API, targeting Postgres.
-- Run once against a fresh database: psql "$DATABASE_URL" -f db/migrations/0000_init.sql

CREATE TABLE championships (
  championship_id text PRIMARY KEY,
  championship_name text,
  url text,
  year integer
);

CREATE TABLE teams (
  team_id text PRIMARY KEY,
  team_name text,
  team_nationality text,
  first_appeareance integer,
  constructors_championships integer,
  drivers_championships integer,
  url text
);

CREATE TABLE drivers (
  driver_id text PRIMARY KEY,
  name text NOT NULL,
  surname text NOT NULL,
  nationality text NOT NULL,
  birthday text NOT NULL,
  number integer,
  short_name text,
  url text
);

CREATE TABLE driver_classifications (
  classification_id serial PRIMARY KEY,
  championship_id text REFERENCES championships(championship_id),
  driver_id text REFERENCES drivers(driver_id),
  team_id text REFERENCES teams(team_id),
  points real,
  position integer,
  wins integer
);

CREATE TABLE constructors_classifications (
  classification_id serial PRIMARY KEY,
  championship_id text REFERENCES championships(championship_id),
  team_id text REFERENCES teams(team_id),
  points real,
  position integer,
  wins integer
);

CREATE TABLE circuits (
  circuit_id text PRIMARY KEY,
  circuit_name text,
  country text,
  city text,
  circuit_length real,
  lap_record text,
  first_participation_year integer,
  number_of_corners integer,
  fastest_lap_driver_id text REFERENCES drivers(driver_id),
  fastest_lap_team_id text REFERENCES teams(team_id),
  fastest_lap_year integer,
  url text,
  svg_path text,
  svg_view_box text
);

CREATE TABLE races (
  race_id text PRIMARY KEY,
  championship_id text REFERENCES championships(championship_id),
  race_name text,
  race_date text,
  circuit text,
  laps integer,
  winner_id text REFERENCES drivers(driver_id),
  team_winner_id text REFERENCES teams(team_id),
  url text,
  round integer,
  race_time text,
  qualy_date text,
  fp1_date text,
  fp2_date text,
  fp3_date text,
  sprint_qualy_date text,
  sprint_race_date text,
  qualy_time text,
  fp1_time text,
  fp2_time text,
  fp3_time text,
  sprint_qualy_time text,
  sprint_race_time text,
  fast_lap text,
  fast_lap_driver_id text,
  fast_lap_team_id text
);

CREATE TABLE classifications (
  classification_id serial PRIMARY KEY,
  race_id text REFERENCES races(race_id),
  driver_id text REFERENCES drivers(driver_id),
  team_id text REFERENCES teams(team_id),
  q1 text,
  q2 text,
  q3 text,
  grid_position integer
);

CREATE TABLE results (
  result_id serial PRIMARY KEY,
  race_id text REFERENCES races(race_id),
  driver_id text REFERENCES drivers(driver_id),
  team_id text REFERENCES teams(team_id),
  finishing_position integer,
  grid_position integer,
  race_time text,
  retired text,
  points_obtained real,
  fast_lap text
);

CREATE TABLE sprint_qualy (
  sprint_qualy_id serial PRIMARY KEY,
  race_id text REFERENCES races(race_id),
  driver_id text REFERENCES drivers(driver_id),
  team_id text REFERENCES teams(team_id),
  sq1 text,
  sq2 text,
  sq3 text,
  grid_position integer
);

CREATE TABLE sprint_race (
  sprint_race_id serial PRIMARY KEY,
  race_id text REFERENCES races(race_id),
  driver_id text REFERENCES drivers(driver_id),
  team_id text REFERENCES teams(team_id),
  finishing_position integer,
  grid_position integer,
  laps integer,
  race_time text,
  retired text,
  points_obtained real
);

CREATE TABLE fp1 (
  fp1_id serial PRIMARY KEY,
  race_id text REFERENCES races(race_id),
  driver_id text REFERENCES drivers(driver_id),
  team_id text REFERENCES teams(team_id),
  time text
);

CREATE TABLE fp2 (
  fp2_id serial PRIMARY KEY,
  race_id text REFERENCES races(race_id),
  driver_id text REFERENCES drivers(driver_id),
  team_id text REFERENCES teams(team_id),
  time text
);

CREATE TABLE fp3 (
  fp3_id serial PRIMARY KEY,
  race_id text REFERENCES races(race_id),
  driver_id text REFERENCES drivers(driver_id),
  team_id text REFERENCES teams(team_id),
  time text
);

-- Performance indexes for high-traffic API filters/orderings.
CREATE INDEX idx_championships_year ON championships(year);
CREATE INDEX idx_races_championship_round ON races(championship_id, round);
CREATE INDEX idx_races_championship_race_date ON races(championship_id, race_date DESC);
CREATE INDEX idx_races_championship_qualy_date ON races(championship_id, qualy_date DESC);
CREATE INDEX idx_races_championship_sprint_qualy_date ON races(championship_id, sprint_qualy_date DESC);
CREATE INDEX idx_races_championship_sprint_race_date ON races(championship_id, sprint_race_date DESC);
CREATE INDEX idx_results_race_finishing_position ON results(race_id, finishing_position);
CREATE INDEX idx_results_driver_race ON results(driver_id, race_id);
CREATE INDEX idx_driver_classifications_championship_position ON driver_classifications(championship_id, position);
CREATE INDEX idx_driver_classifications_championship_team ON driver_classifications(championship_id, team_id);
CREATE INDEX idx_constructors_classifications_championship_position ON constructors_classifications(championship_id, position);
CREATE INDEX idx_classifications_race_grid ON classifications(race_id, grid_position);
CREATE INDEX idx_sprint_race_race_finishing_position ON sprint_race(race_id, finishing_position);
CREATE INDEX idx_sprint_qualy_race_grid ON sprint_qualy(race_id, grid_position);
CREATE INDEX idx_fp1_race_time ON fp1(race_id, time);
CREATE INDEX idx_fp2_race_time ON fp2(race_id, time);
CREATE INDEX idx_fp3_race_time ON fp3(race_id, time);
