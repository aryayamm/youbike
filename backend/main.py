import os
import psycopg
import time
from psycopg.rows import dict_row
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi import FastAPI, HTTPException
from collector import fetch_stations
load_dotenv()

app = FastAPI()

_cache = {"at": 0.0, "data": {}}

def get_all_stations():
    """YouBike's full list, cached for 60 seconds."""
    if not _cache["data"] or time.time() - _cache["at"] > 60:
        _cache["data"] = fetch_stations()
        _cache["at"] = time.time()
    return _cache["data"]

from fastapi.middleware.cors import CORSMiddleware

ALLOWED = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED,
    allow_methods=["*"],
    allow_headers=["*"],
)

LATEST_SQL = """
    SELECT DISTINCT ON (s.station_id)
           s.station_id, s.name, sn.bikes, sn.empty_docks,
           sn.yb1_bikes, sn.yb2_bikes, sn.eyb_bikes, sn.collected_at,
           sn.status
    FROM stations s
    LEFT JOIN snapshots sn ON sn.station_id = s.station_id
    WHERE s.is_monitored = TRUE
    ORDER BY s.station_id, sn.collected_at DESC NULLS LAST
"""

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/stations")
def get_stations():
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        rows = conn.execute(LATEST_SQL).fetchall()
    return rows

@app.get("/search")
def search(q: str):
    q = q.strip().lower()
    if len(q) < 2:
        return []
    results = []
    for s in get_all_stations().values():
        names = f"{s.get('name_tw', '')} {s.get('name_en', '')}".lower()
        if q in names:
            results.append({
                "station_id": s.get("station_no"),
                "name_tw": s.get("name_tw"),
                "name_en": s.get("name_en"),
            })
        if len(results) >= 10:
            break
    return results

@app.post("/stations/{station_id}")
def add_station(station_id: str):
    station = get_all_stations().get(station_id)
    if station is None:
        raise HTTPException(status_code=404, detail="Station not found")
    name = station.get("name_en") or station.get("name_tw") or station_id
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        conn.execute(
            "INSERT INTO stations (station_id, name, is_monitored) VALUES (%s, %s, TRUE) "
            "ON CONFLICT (station_id) DO UPDATE SET is_monitored = TRUE",
            (station_id, name),
        )
    return {"ok": True}

@app.delete("/stations/{station_id}")
def remove_station(station_id: str):
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        conn.execute(
            "UPDATE stations SET is_monitored = FALSE WHERE station_id = %s",
            (station_id,),
        )
    return {"ok": True}
ANALYTICS_SQL = """
    SELECT
      s.station_id,
      s.name,
      EXTRACT(HOUR FROM sn.collected_at AT TIME ZONE 'Asia/Taipei')::int AS hour,
      ROUND(AVG(sn.bikes), 1)::float AS avg_bikes,
      COUNT(*) AS samples
    FROM snapshots sn
    JOIN stations s ON s.station_id = sn.station_id
    WHERE (sn.status = 1
           OR (sn.status IS NULL AND sn.bikes + sn.empty_docks > 0))
      AND s.station_id IN ('500401008', '500401016', '500401004', '508201019')
    GROUP BY s.station_id, s.name, hour
    ORDER BY s.name, hour
"""

@app.get("/analytics")
def analytics():
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        rows = conn.execute(ANALYTICS_SQL).fetchall()
    return rows

SUMMARY_SQL = """
    SELECT
      s.station_id,
      s.name,
      EXTRACT(DOW  FROM sn.collected_at AT TIME ZONE 'Asia/Taipei')::int AS dow,
      EXTRACT(HOUR FROM sn.collected_at AT TIME ZONE 'Asia/Taipei')::int AS hour,
      COUNT(*)::int AS samples,
      COALESCE(SUM(sn.bikes), 0)::int AS bikes,
      COALESCE(SUM(sn.yb1_bikes), 0)::int AS yb1,
      COALESCE(SUM(sn.yb2_bikes), 0)::int AS yb2,
      COALESCE(SUM(sn.eyb_bikes), 0)::int AS eyb,
      COALESCE(SUM(sn.empty_docks), 0)::int AS docks
    FROM snapshots sn
    JOIN stations s ON s.station_id = sn.station_id
    WHERE (sn.status = 1
           OR (sn.status IS NULL AND sn.bikes + sn.empty_docks > 0))
        AND s.is_monitored = TRUE
    GROUP BY s.station_id, s.name, dow, hour
    ORDER BY s.name, dow, hour
"""

@app.get("/analytics/summary")
def analytics_summary():
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        return conn.execute(SUMMARY_SQL).fetchall()

@app.get("/map/stations")
def map_stations(min_lat: float, max_lat: float, min_lng: float, max_lng: float):
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        rows = conn.execute(
            "SELECT station_id FROM stations WHERE is_monitored = TRUE"
        ).fetchall()
    monitored = {r[0] for r in rows}

    out = []
    for s in get_all_stations().values():
        try:
            lat = float(s.get("lat"))
            lng = float(s.get("lng"))
        except (TypeError, ValueError):
            continue
        if not (min_lat <= lat <= max_lat and min_lng <= lng <= max_lng):
            continue
        sid = str(s.get("station_no"))
        out.append({
            "station_id": sid,
            "name_en": s.get("name_en"),
            "name_tw": s.get("name_tw"),
            "lat": lat,
            "lng": lng,
            "bikes": s.get("available_spaces"),
            "docks": s.get("empty_spaces"),
            "status": s.get("status"),
            "monitored": sid in monitored,
        })
        if len(out) >= 300:
            break
    return out