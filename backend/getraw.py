
import requests
import json

API_URL = "https://apis.youbike.com.tw/json/station-yb2.json"

STATION_ID = "500401008"  # NTHU North Gate

headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.youbike.com.tw/",
}

response = requests.get(API_URL, headers=headers, timeout=15)
response.raise_for_status()

data = response.json()

# Handle different API response formats
if isinstance(data, dict):
    data = data.get("retVal", data.get("data", data))

if isinstance(data, dict):
    data = list(data.values())

# Find the selected station
station = next(
    (
        item for item in data
        if isinstance(item, dict)
        and str(item.get("station_no")) == STATION_ID
    ),
    None
)

if station is None:
    print(f"Station {STATION_ID} not found.")
else:
    print(json.dumps(station, indent=4, ensure_ascii=False))
