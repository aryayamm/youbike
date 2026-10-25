
import requests

API_URL = "https://apis.youbike.com.tw/json/station-yb2.json"

headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.youbike.com.tw/",
}

response = requests.get(API_URL, headers=headers, timeout=15)
response.raise_for_status()
data = response.json()

if isinstance(data, dict):
    data = data.get("retVal", data.get("data", data))

if isinstance(data, dict):
    data = list(data.values())

# Ask for a station name in English or Chinese
keyword = input("Search station name: ").strip().lower()

found = False

for station in data:
    if not isinstance(station, dict):
        continue

    name_en = station.get("name_en", "")
    name_tw = station.get("name_tw", "")
    station_id = station.get("station_no", "")

    if (keyword in name_en.lower()
            or keyword in name_tw.lower()):

        print(f"Name (English): {name_en}")
        print(f"Name (Chinese): {name_tw}")
        print(f"Station ID: {station_id}")
        print(f"Status: {station.get('status')}")
        print("-" * 40)
        found = True

if not found:
    print("No matching stations found.")
#5#############################################################################################################################################################################################################################################################