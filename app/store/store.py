"""Tiny SQLite-backed store for jobs and recipes (JSON blobs keyed by id).

Deliberately dependency-free (stdlib sqlite3). WAL + a write lock make it safe for the
API thread + the background worker thread to share one connection.
"""
from __future__ import annotations

import sqlite3
import threading
from functools import lru_cache

from app.config import settings
from app.models.job import Job
from app.models.recipe import Recipe

_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_recipes_created ON recipes(created_at);
"""


class Store:
    def __init__(self, db_path: str) -> None:
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL;")
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    # ── jobs ─────────────────────────────────────────────────────────────────
    def save_job(self, job: Job) -> Job:
        with self._lock:
            self._conn.execute(
                "INSERT INTO jobs (id, created_at, data) VALUES (?, ?, ?) "
                "ON CONFLICT(id) DO UPDATE SET data=excluded.data",
                (job.id, job.created_at.isoformat(), job.model_dump_json()),
            )
            self._conn.commit()
        return job

    def get_job(self, job_id: str) -> Job | None:
        cur = self._conn.execute("SELECT data FROM jobs WHERE id = ?", (job_id,))
        row = cur.fetchone()
        return Job.model_validate_json(row["data"]) if row else None

    def list_jobs(self, limit: int = 50) -> list[Job]:
        cur = self._conn.execute(
            "SELECT data FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)
        )
        return [Job.model_validate_json(r["data"]) for r in cur.fetchall()]

    # ── recipes ──────────────────────────────────────────────────────────────
    def save_recipe(self, recipe: Recipe) -> Recipe:
        with self._lock:
            self._conn.execute(
                "INSERT INTO recipes (id, created_at, data) VALUES (?, ?, ?) "
                "ON CONFLICT(id) DO UPDATE SET data=excluded.data",
                (recipe.id, recipe.generated_at.isoformat(), recipe.model_dump_json()),
            )
            self._conn.commit()
        return recipe

    def get_recipe(self, recipe_id: str) -> Recipe | None:
        cur = self._conn.execute("SELECT data FROM recipes WHERE id = ?", (recipe_id,))
        row = cur.fetchone()
        return Recipe.model_validate_json(row["data"]) if row else None

    def list_recipes(self, limit: int = 50) -> list[Recipe]:
        cur = self._conn.execute(
            "SELECT data FROM recipes ORDER BY created_at DESC LIMIT ?", (limit,)
        )
        return [Recipe.model_validate_json(r["data"]) for r in cur.fetchall()]


@lru_cache
def get_store() -> Store:
    return Store(str(settings.sqlite_path))
