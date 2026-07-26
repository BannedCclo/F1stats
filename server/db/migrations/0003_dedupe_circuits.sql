-- The historical bulk populate and the newer per-race scrapes picked up two
-- different circuitId schemes for the same real-world circuit from f1api.dev
-- (an older, sparsely-populated id used by pre-2024 races, and a newer,
-- fully-populated id used by 2024+ races). Repoint races at the richer id
-- and drop the sparse duplicate row.
--
-- Las Vegas is deliberately NOT included here: 'vegas' (2023-2026, Las Vegas
-- Strip Circuit) and 'las_vegas' (1981-1982, Caesars Palace Grand Prix) are
-- two different real circuits that happen to share a city, not a duplicate.

UPDATE races SET circuit = 'hermanos_rodriguez' WHERE circuit = 'rodriguez';
DELETE FROM circuits WHERE circuit_id = 'rodriguez';

UPDATE races SET circuit = 'austin' WHERE circuit = 'americas';
DELETE FROM circuits WHERE circuit_id = 'americas';

DELETE FROM circuits WHERE circuit_id = 'bahrein';

UPDATE races SET circuit = 'gilles_villeneuve' WHERE circuit = 'villeneuve';
DELETE FROM circuits WHERE circuit_id = 'villeneuve';

UPDATE races SET circuit = 'paul_ricard' WHERE circuit = 'ricard';
DELETE FROM circuits WHERE circuit_id = 'ricard';

UPDATE races SET circuit = 'montmelo' WHERE circuit = 'catalunya';
DELETE FROM circuits WHERE circuit_id = 'catalunya';

-- Data-quality fix unrelated to the dedupe above: this row's city was
-- scraped as the state ("Nevada") instead of the city.
UPDATE circuits SET city = 'Las Vegas' WHERE circuit_id = 'las_vegas' AND city = 'Nevada';
