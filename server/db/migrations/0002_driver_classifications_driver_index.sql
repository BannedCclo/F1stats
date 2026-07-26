-- Speeds up "which seasons has this driver raced in" lookups
-- (driver_classifications was only indexed by championship_id before).
CREATE INDEX idx_driver_classifications_driver ON driver_classifications(driver_id);
