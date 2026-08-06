import { pgTable, integer, real, serial, text, timestamp, unique } from "drizzle-orm/pg-core"

export const championships = pgTable("championships", {
	championshipId: text("championship_id").primaryKey(),
	championshipName: text("championship_name"),
	url: text("url"),
	year: integer("year"),
});

export const teams = pgTable("teams", {
	teamId: text("team_id").primaryKey(),
	teamName: text("team_name"),
	teamNationality: text("team_nationality"),
	firstAppeareance: integer("first_appeareance"),
	constructorsChampionships: integer("constructors_championships"),
	driversChampionships: integer("drivers_championships"),
	url: text("url"),
});

export const drivers = pgTable("drivers", {
	driverId: text("driver_id").primaryKey(),
	name: text("name").notNull(),
	surname: text("surname").notNull(),
	nationality: text("nationality").notNull(),
	birthday: text("birthday").notNull(),
	number: integer("number"),
	shortName: text("short_name"),
	url: text("url"),
});

export const driverClassifications = pgTable("driver_classifications", {
	classificationId: serial("classification_id").primaryKey(),
	championshipId: text("championship_id").references(() => championships.championshipId),
	driverId: text("driver_id").references(() => drivers.driverId),
	teamId: text("team_id").references(() => teams.teamId),
	points: real("points"),
	position: integer("position"),
	wins: integer("wins"),
}, (table) => [
	unique().on(table.championshipId, table.driverId),
]);

export const constructorsClassifications = pgTable("constructors_classifications", {
	classificationId: serial("classification_id").primaryKey(),
	championshipId: text("championship_id").references(() => championships.championshipId),
	teamId: text("team_id").references(() => teams.teamId),
	points: real("points"),
	position: integer("position"),
	wins: integer("wins"),
}, (table) => [
	unique().on(table.championshipId, table.teamId),
]);

// Who's entered this championship and for which team — distinct from
// driverClassifications (points/position), see db/migrations/0005_season_entries.sql.
export const seasonEntries = pgTable("season_entries", {
	seasonEntryId: serial("season_entry_id").primaryKey(),
	championshipId: text("championship_id").references(() => championships.championshipId),
	driverId: text("driver_id").references(() => drivers.driverId),
	teamId: text("team_id").references(() => teams.teamId),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
	unique().on(table.championshipId, table.driverId),
]);

export const circuits = pgTable("circuits", {
	circuitId: text("circuit_id").primaryKey(),
	circuitName: text("circuit_name"),
	country: text("country"),
	city: text("city"),
	circuitLength: real("circuit_length"),
	lapRecord: text("lap_record"),
	firstParticipationYear: integer("first_participation_year"),
	numberOfCorners: integer("number_of_corners"),
	fastestLapDriverId: text("fastest_lap_driver_id").references(() => drivers.driverId),
	fastestLapTeamId: text("fastest_lap_team_id").references(() => teams.teamId),
	fastestLapYear: integer("fastest_lap_year"),
	url: text("url"),
	svgPath: text("svg_path"),
	svgViewBox: text("svg_view_box"),
});

export const classifications = pgTable("classifications", {
	classificationId: serial("classification_id").primaryKey(),
	raceId: text("race_id").references(() => races.raceId),
	driverId: text("driver_id").references(() => drivers.driverId),
	teamId: text("team_id").references(() => teams.teamId),
	q1: text("q1"),
	q2: text("q2"),
	q3: text("q3"),
	gridPosition: integer("grid_position"),
}, (table) => [
	unique().on(table.raceId, table.driverId),
]);

export const races = pgTable("races", {
	raceId: text("race_id").primaryKey(),
	championshipId: text("championship_id").references(() => championships.championshipId),
	raceName: text("race_name"),
	raceDate: text("race_date"),
	circuit: text("circuit"),
	laps: integer("laps"),
	winnerId: text("winner_id").references(() => drivers.driverId),
	teamWinnerId: text("team_winner_id").references(() => teams.teamId),
	url: text("url"),
	round: integer("round"),
	raceTime: text("race_time"),
	qualyDate: text("qualy_date"),
	fp1Date: text("fp1_date"),
	fp2Date: text("fp2_date"),
	fp3Date: text("fp3_date"),
	sprintQualyDate: text("sprint_qualy_date"),
	sprintRaceDate: text("sprint_race_date"),
	qualyTime: text("qualy_time"),
	fp1Time: text("fp1_time"),
	fp2Time: text("fp2_time"),
	fp3Time: text("fp3_time"),
	sprintQualyTime: text("sprint_qualy_time"),
	sprintRaceTime: text("sprint_race_time"),
	fastLap: text("fast_lap"),
	fastLapDriverId: text("fast_lap_driver_id"),
	fastLapTeamId: text("fast_lap_team_id"),
});

export const results = pgTable("results", {
	resultId: serial("result_id").primaryKey(),
	raceId: text("race_id").references(() => races.raceId),
	driverId: text("driver_id").references(() => drivers.driverId),
	teamId: text("team_id").references(() => teams.teamId),
	finishingPosition: integer("finishing_position"),
	gridPosition: integer("grid_position"),
	raceTime: text("race_time"),
	retired: text("retired"),
	pointsObtained: real("points_obtained"),
	fastLap: text("fast_lap"),
}, (table) => [
	unique().on(table.raceId, table.driverId),
]);

export const sprintQualy = pgTable("sprint_qualy", {
	sprintQualyId: serial("sprint_qualy_id").primaryKey(),
	raceId: text("race_id").references(() => races.raceId),
	driverId: text("driver_id").references(() => drivers.driverId),
	teamId: text("team_id").references(() => teams.teamId),
	sq1: text("sq1"),
	sq2: text("sq2"),
	sq3: text("sq3"),
	gridPosition: integer("grid_position"),
}, (table) => [
	unique().on(table.raceId, table.driverId),
]);

export const sprintRace = pgTable("sprint_race", {
	sprintRaceId: serial("sprint_race_id").primaryKey(),
	raceId: text("race_id").references(() => races.raceId),
	driverId: text("driver_id").references(() => drivers.driverId),
	teamId: text("team_id").references(() => teams.teamId),
	finishingPosition: integer("finishing_position"),
	gridPosition: integer("grid_position"),
	laps: integer("laps"),
	raceTime: text("race_time"),
	retired: text("retired"),
	pointsObtained: real("points_obtained"),
}, (table) => [
	unique().on(table.raceId, table.driverId),
]);

export const fp1 = pgTable("fp1", {
	fp1Id: serial("fp1_id").primaryKey(),
	raceId: text("race_id").references(() => races.raceId),
	driverId: text("driver_id").references(() => drivers.driverId),
	teamId: text("team_id").references(() => teams.teamId),
	time: text("time"),
}, (table) => [
	unique().on(table.raceId, table.driverId),
]);

export const fp3 = pgTable("fp3", {
	fp3Id: serial("fp3_id").primaryKey(),
	raceId: text("race_id").references(() => races.raceId),
	driverId: text("driver_id").references(() => drivers.driverId),
	teamId: text("team_id").references(() => teams.teamId),
	time: text("time"),
}, (table) => [
	unique().on(table.raceId, table.driverId),
]);

export const fp2 = pgTable("fp2", {
	fp2Id: serial("fp2_id").primaryKey(),
	raceId: text("race_id").references(() => races.raceId),
	driverId: text("driver_id").references(() => drivers.driverId),
	teamId: text("team_id").references(() => teams.teamId),
	time: text("time"),
}, (table) => [
	unique().on(table.raceId, table.driverId),
]);
