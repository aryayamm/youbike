import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi import FastAPI, HTTPException
from collector import fetch_stations
load_dotenv()

app = FastAPI()

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
           sn.yb1_bikes, sn.yb2_bikes, sn.eyb_bikes, sn.collected_at
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
    for s in fetch_stations().values():
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
    station = fetch_stations().get(station_id)
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