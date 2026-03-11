-- Migration 009: Users table for authentication
-- Default admin user seeded below

CREATE TABLE IF NOT EXISTS users (
    id         TEXT    NOT NULL PRIMARY KEY,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    name       TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
