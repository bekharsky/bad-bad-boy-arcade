CREATE TABLE IF NOT EXISTS leaderboard (
  player_id TEXT PRIMARY KEY NOT NULL CHECK (length(player_id) = 36),
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 2 AND 18),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 2000000000),
  wave INTEGER NOT NULL CHECK (wave BETWEEN 1 AND 1000000),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS leaderboard_ranking
  ON leaderboard(score DESC, updated_at ASC);

CREATE TABLE IF NOT EXISTS shared_scores (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 1 AND 18),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 2000000000),
  wave INTEGER NOT NULL CHECK (wave BETWEEN 1 AND 1000000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) WITHOUT ROWID;
