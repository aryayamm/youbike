import os
import requests
import psycopg
from dotenv import load_dotenv

load_dotenv()

API_URL = "https://apis.youbike.com.tw/json/station-yb2.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.youbike.com.tw/",
}

def fetch_stations():
    #get alls tation 
    response = requests.get(API_URL, headers=HEADERS, timeout=15)
    response.raise_for_status()
    data = response.json()

    if isinstance(data, dict):
        data = data.get("retVal", data.get("data", data))
    if isinstance(data, dict):
        data = list(data.values())

    return {
        str(s.get("station_no")): s
        for s in data
        if isinstance(s, dict)
    }

def get_monitored(conn):
    #get ids of the station we want
    rows = conn.execute(
        "SELECT station_id FROM stations WHERE is_monitored = TRUE"
    ).fetchall()
    return [row[0] for row in rows]

def save_snapshots(conn, ids, all_stations):
    missing = 0
    for station_id in ids:
        station = all_stations.get(station_id)
        if station is None:
            missing += 1
            print(f"Warning missing data on id: {station_id}")
            continue

        detail = station.get("available_spaces_detail") or {}
        updated = station.get("updated_at")
        source_updated_at = f"{updated}+08:00" if updated else None

        conn.execute(
            "INSERT INTO snapshots (station_id, bikes, empty_docks, yb1_bikes, yb2_bikes, eyb_bikes, source_updated_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (
                station_id,
                station.get("available_spaces"),
                station.get("empty_spaces"),
                detail.get("yb1"),
                detail.get("yb2"),
                detail.get("eyb"),
                source_updated_at,
            ),
        )
    return missing

if __name__ == "__main__":
    all_stations = fetch_stations()
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        ids = get_monitored(conn)
        missing = save_snapshots(conn, ids, all_stations)

    print(f"Saved {len(ids) - missing} of {len(ids)} stations")