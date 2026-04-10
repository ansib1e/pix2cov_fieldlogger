# PixelVox Field Logger

A single-file HTML webapp for logging camera positions, orientations, and
landmarks during shoots. Works offline on any phone with a modern browser.

## Host on GitHub Pages

1. Push this folder to a public GitHub repo (e.g. `yourname/pixelvox-field-logger`)
2. In repo Settings → Pages → Source → `main` branch, `/` root
3. Visit `https://yourname.github.io/pixelvox-field-logger/`
4. On your phone, add to home screen for offline access

All data is stored in browser localStorage — nothing is uploaded anywhere.
You export when you're done and transfer via AirDrop / email / etc.

## What it captures

- **Positions** — averaged GPS for each camera tripod (lat/lon/alt with accuracy)
- **Orientations** — snapshot of heading/pitch/roll from phone sensors (reference only, not precise)
- **Landmarks** — catalog of known reference points for post-shoot calibration

## Export formats

- **JSON** — everything combined, for archival
- **Landmarks CSV** — the `name,lat,lon,alt` format expected by `landmark_calibrate.py`

## Important notes

- The compass heading reading is for **reference only**. Phone magnetometers are
  inherently inaccurate (5-15° error). Use `landmark_calibrate.py` in post-shoot
  to get precise orientation.
- iOS requires explicit permission for orientation sensors. Tap "Request Permission"
  on the Orientation tab before it will work.
- GPS accuracy improves with time. Average for at least 2-5 minutes per position.
