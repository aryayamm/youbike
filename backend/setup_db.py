import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

STATIONS = {
    "NTHU North Gate": "500401008",
    "NTHU Delta Hall": "500401016",
    "NTHU Food Court": "500401004",
    "HSP Baoshan Rd.": "508201019",
}

with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS stations (
            station_id   TEXT PRIMARY KEY,
            name         TEXT NOT NULL,
            is_monitored BOOLEAN NOT NULL DEFAULT TRUE
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS snapshots (
            id           BIGSERIAL PRIMARY KEY,
            station_id   TEXT NOT NULL REFERENCES stations(station_id),
            collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            bikes        INTEGER,
            empty_docks  INTEGER,
            yb1_bikes    INTEGER,
            yb2_bikes    INTEGER,
            eyb_bikes    INTEGER,
            source_updated_at TIMESTAMPTZ,
            source_updated_at TIMESTAMPTZ,
            status INTEGER,
            parking_spaces INTEGER
        )
    """)

    for name, station_id in STATIONS.items():
        conn.execute(
            "INSERT INTO stations (station_id, name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (station_id, name),
        )

print("Database ready")