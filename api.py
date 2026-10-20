import requests

API_URL = "https://apis.youbike.com.tw/json/station-yb2.json"

STATIONS = {
    "NTHU North Gate": "500401008",
    "NTHU Delta Hall": "500401016",
    "NTHU Food Court": "500401004",
    "HSP Baoshan Rd.": "508201019",
}

headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.youbike.com.tw/",
}

response = requests.get(API_URL, headers=headers, timeout=15)
response.raise_for_status()
data = response.json()

# Handle either a list or a dictionary containing station records.
if isinstance(data, dict):
    data = data.get("retVal", data.get("data", data))

if isinstance(data, dict):
    data = list(data.values())

stations_by_id = {
    str(station.get("station_no")): station
    for station in data
    if isinstance(station, dict)
}

for label, station_id in STATIONS.items():
    station = stations_by_id.get(station_id)

    if station is None:
        print(f"{label}: station not found")
        continue

    bikes = station.get("available_spaces", "?")
    docks = station.get("empty_spaces", "?")
    updated = station.get("updated_at", station.get("time", "?"))

    print(f"\n{label}")
    print(f"  Name: {station.get('name_tw', '?')}")
    print(f"  Bikes: {bikes}")
    print(f"  Empty docks: {docks}")
    print(f"  Updated: {updated}")