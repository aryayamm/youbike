import requests
import csv
from datetime import datetime
import os

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

filename = "youbike_history.csv"

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

timestamp = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S")

file_exists = os.path.exists(filename)

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

    with open(filename, "a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)

        if file_exists == False:
            writer.writerow([
                "timestamp",
                "station_id",
                "name",
                "bikes",
                "empty_docks"
            ])
            file_exists = True

        writer.writerow([
            timestamp,
            str(station_id),
            label,
            bikes,
            docks
        ])
print(f"Saved in {filename} in {timestamp}")

# import requests

# API_URL = "https://apis.youbike.com.tw/json/station-yb2.json"

# STATIONS = {
#     "NTHU North Gate": "500401008",
#     "NTHU Delta Hall": "500401016",
#     "NTHU Food Court": "500401004",
#     "HSP Baoshan Rd.": "508201019",
# }

# headers = {
#     "User-Agent": "Mozilla/5.0",
#     "Accept": "application/json, text/plain, */*",
#     "Referer": "https://www.youbike.com.tw/",
# }

# response = requests.get(API_URL, headers=headers, timeout=15)
# response.raise_for_status()
# data = response.json()

# # Handle either a list or a dictionary containing station records.
# if isinstance(data, dict):
#     data = data.get("retVal", data.get("data", data))

# if isinstance(data, dict):
#     data = list(data.values())

# stations_by_id = {
#     str(station.get("station_no")): station
#     for station in data
#     if isinstance(station, dict)
# }

# def find(label, id):
#     station = stations_by_id.get(str(id))

#     if station is None:
#         print(f"{label}: station not found")
#         return 0

#     bikes = station.get("available_spaces", "?")
#     docks = station.get("empty_spaces", "?")
#     updated = station.get("updated_at", station.get("time", "?"))

#     print(f"\n{label}")
#     print(f"  Name: {station.get('name_tw', '?')}")
#     print(f"  Bikes: {bikes}")
#     print(f"  Empty docks: {docks}")
#     print(f"  Updated: {updated}")

# print("1. NTHU North Gate")
# print("2. NTHU Delta Hall")
# print("3. NTHU Food Court")
# print("4. HSP Baoshan Rd.")
# ###########################################################################################################################################################################################################
# user = int(input("Which station (1-4): "))
# if user == 1:
#     find("NTHU North Gate", 500401008)
# elif user == 2:
#     find("NTHU Delta Hall", 500401016)
# elif user == 3:
#     find("NTHU Food Court", 500401004)
# elif user == 4:
#     find("HSP Baoshan Rd.", 508201019)
# else:
#     print("invalid, bye")
