# NTHU YouBike Ride

For week one theme is outside, so i made a youbike tracker for people going outside in Taiwan.
Basicaly this is a web app for people in taiwan to monitor You-Bike availability, check ussage patterns.
Planning to make the route planner so you can go from hsinchu to taipei by you-bike for 0 dollars :D

I plan on doing this project for 2 weeks since i don't have much free time lol.

**Demo:** https://nthu-bike.vercel.app

## Features
- Bike availability and empty docks per station, split by bike type youbike 1.0, 2.0, and 2.0E
- Add or remove monitored stations by name search or from a map
- Suspended stations are labelled as suspended instead of showing zeros
- Hourly charts for available bikes and empty docks (Taipei time)
- Weekly heatmap with a metric toggle, bike-type filter, and station filter

Trip planning and routes are not built yet.

## How it works

```
Tech Stack:
Next.js: Frontend framework
Python: Backend
YouBike API: Data source from youbike website it self
NeonDB (PostgreSQL): Database

cron-job.org (every 5 min) -> GitHub Actions -> collector.py -> NeonDB (Postgres)

Next.js site (Vercel) -> FastAPI backend (Vercel) -------------------+
```

- **Collector** (`backend/collector.py`): fetches the YouBike station list, then saves one row per monitored station into snapshots.
- **API** (`backend/main.py`): FastAPI endpoints for the latest station data, station search, add/remove, map data, and analytics.
- **Frontend** (`frontend/`): Next.js and TypeScript. Charts use Recharts, the map uses esri, icons come from lucide.
- **Database**: NeonDB (PostgreSQL) with two tables, `stations` and `snapshots`.

Notes from building it:

- GitHub's own cron schedule skipped most runs on a small repo, so cron-job.org triggers the workflow every 5 minutes instead.
- cron-job or github actiosn sometimes fail 10 times a day, but data is enough
- Each snapshot stores the station's `status`. Analytics skip suspended stations (for example during a typhoon) so closed stations don't count as empty ones.

## Project structure

```
backend/
  collector.py     fetch + save snapshots
  main.py          FastAPI app
  setup_db.py      creates tables and seeds the starter stations
  requirements.txt
frontend/          Next.js app
.github/workflows/collect.yml   runs the collector
```

## Run it locally

You need Python 3.12, Node.js, and a free NeonDB project.

**1. Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
DATABASE_URL=postgresql://..
```

Then run database setup and fetch data from youbike api:

```bash
python setup_db.py              # creates tables, adds the 4 starter stations
python collector.py             # saves one round of snapshots
uvicorn main:app --reload       # API at http://127.0.0.1:8000
```

**2. Frontend** 

```bash
cd frontend
npm install
npm run dev                     # site at http://localhost:3000
```

## Deployment

- Backend and frontend are two separate Vercel projects from this repo (root directories `backend` and `frontend`).
- Backend environment variables: `DATABASE_URL`, `ALLOWED_ORIGINS` (the frontend's URL).
- Frontend environment variable: `NEXT_PUBLIC_API_URL` (the backend's URL).
- GitHub Actions needs a `DATABASE_URL` repository secret.
