-- 0003 deliberately kept 'vegas' (2023-2026, Las Vegas Strip Circuit) and
-- 'las_vegas' (1981-1982, Caesars Palace Grand Prix) as separate rows since
-- they're physically different circuits. Product call: merge them into one
-- entry anyway so the circuits list doesn't show two "Las Vegas" tiles.
-- Note this attributes the Strip Circuit's layout/lap record to the 1981-82
-- races, which isn't historically accurate.

UPDATE races SET circuit = 'vegas' WHERE circuit = 'las_vegas';
DELETE FROM circuits WHERE circuit_id = 'las_vegas';
