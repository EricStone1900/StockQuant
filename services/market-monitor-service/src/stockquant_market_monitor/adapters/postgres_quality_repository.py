"""PostgreSQL repository for Monitor-owned quality snapshots."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import psycopg
from psycopg.types.json import Jsonb


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _scope_key(scope: dict[str, Any]) -> str:
    return hashlib.sha256(_canonical(scope).encode()).hexdigest()


class PostgresQualityRepository:
    def __init__(self, database_url: str) -> None:
        if not database_url:
            raise ValueError("STOCKQUANT_DATABASE_URL is required")
        self.database_url = database_url

    def ping(self) -> None:
        with psycopg.connect(self.database_url) as connection:
            connection.execute("SELECT 1")

    def migrate(self) -> None:
        with psycopg.connect(self.database_url) as connection:
            connection.execute("SELECT pg_advisory_xact_lock(hashtext('stockquant:market-monitor-service:schema-migrations'))")
            connection.execute("""CREATE TABLE IF NOT EXISTS market_monitor_schema_migrations (
                version INTEGER PRIMARY KEY,
                description TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )""")
            version_row = connection.execute("SELECT version FROM market_monitor_schema_migrations ORDER BY version DESC LIMIT 1").fetchone()
            version = version_row[0] if version_row else 0
            if version > 1:
                raise RuntimeError(f"Unsupported Market Monitor schema version {version}")
            migration = Path(__file__).resolve().parents[3] / "migrations" / "001_quote_quality_snapshots.sql"
            connection.execute(migration.read_text(encoding="utf-8"))
            if version < 1:
                connection.execute("INSERT INTO market_monitor_schema_migrations(version,description) VALUES (1,'V2.1 scoped quote quality snapshots')")

    def save(self, scope: dict[str, Any], task_id: str, input_value: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
        scope_key = _scope_key(scope)
        input_hash = hashlib.sha256(_canonical(input_value).encode()).hexdigest()
        evaluation_id = "quotequality:" + hashlib.sha256(f"{scope_key}:{task_id}".encode()).hexdigest()
        with psycopg.connect(self.database_url) as connection:
            inserted = connection.execute("""INSERT INTO market_monitor_quote_quality_snapshots
                (evaluation_id,scope_key,scope_json,task_id,input_hash,result_json)
                VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT(scope_key,task_id) DO NOTHING
                RETURNING result_json,created_at""", (evaluation_id, scope_key, Jsonb(scope), task_id, input_hash, Jsonb(result))).fetchone()
            if inserted:
                return {**inserted[0], "evaluationId": evaluation_id, "evaluatedAt": inserted[1].isoformat()}
            existing = connection.execute("""SELECT evaluation_id,input_hash,result_json,created_at
                FROM market_monitor_quote_quality_snapshots WHERE scope_key=%s AND task_id=%s""", (scope_key, task_id)).fetchone()
            if not existing:
                raise RuntimeError("QUALITY_IDEMPOTENCY_READ_FAILED")
            if existing[1] != input_hash:
                raise ValueError("QUALITY_TASK_INPUT_CONFLICT")
            return {**existing[2], "evaluationId": existing[0], "evaluatedAt": existing[3].isoformat()}

    def latest(self, scope: dict[str, Any]) -> dict[str, Any] | None:
        with psycopg.connect(self.database_url) as connection:
            row = connection.execute("""SELECT evaluation_id,result_json,created_at
                FROM market_monitor_quote_quality_snapshots WHERE scope_key=%s
                ORDER BY created_at DESC,evaluation_id DESC LIMIT 1""", (_scope_key(scope),)).fetchone()
        if not row:
            return None
        return {**row[1], "evaluationId": row[0], "evaluatedAt": row[2].isoformat()}
