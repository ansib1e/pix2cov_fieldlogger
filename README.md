# Field Logger

Offline-capable single-page webapp (`index.html`) for collecting everything the pipeline needs from a shoot,
on a phone, and exporting it as the `recipe.json` that `tools/ingest_shoot.py` reads.

## Usage

1. Serve `index.html` over HTTPS (GPS and orientation APIs need a secure context) - e.g. GitHub Pages, or on
   the laptop `python -m http.server` behind a tunnel - and open it on the phone. Add to home screen for offline use.
2. On site, work through the tabs in order:
   - **Position** - stand the phone on each tripod head, average 2-5 min, save with a label.
   - **Landmarks** - pin or type >= 5 landmarks per camera view (runway ends, towers, buildings), plus the on-axis one.
   - **Cameras** - one entry per camera in `camera_index` order. Label = the video file stem you will copy into
     `raw/` (e.g. `iphone15` -> `iphone15.mp4`). Pick its tripod position and on-axis landmark, enter the measured FOV,
     tick stabilisation OFF / exposure locked / focus locked.
   - **Sync** - film the millisecond UTC clock with every camera at the start; press **SYNC EVENT NOW** at the
     exact moment of the visual sync event (board drop / torch), at the start and again at the end. Optionally stamp
     each camera's record start. Fill in the Session panel (site, weather, ADS-B capture running).
   - **Export** - *Import from another device* merges a full-log JSON (the camera phones cannot run this page while
     recording: do the setup on the iPhone, export the full log, import it on the laptop that presses SYNC EVENT NOW,
     export recipe.json from there). *Share / Save recipe.json*. It warns about missing items (no FOV, stabilisation not confirmed,
     fewer than 5 landmarks, no start sync event, no ADS-B) before exporting.
3. On the laptop: `data/runs/<YYYY-MM-DD_site>/raw/*.mp4` + the exported `recipe.json` beside `raw/`.
   Add `cameras[].sync_event_seconds` (raw-video time, in seconds, where the sync event appears in each video),
   check `grid`, delete the `_fill_in_before_ingest` list, then `python tools/run_pipeline.py data/runs/<run>`.

## What the export contains

Exactly the recipe fields `ingest_shoot.py` reads (`target_fps`, `frame_width`, `sync_event_utc`, `anchor_camera`,
`cameras[].label/video_file/camera_index/lat/lon/alt/heading/elev/roll/fov_degrees/detection_mode`,
optional `start_time_utc`, `grid`, `basemap`) plus underscore-prefixed provenance (`_device`, `_fov_source`,
`_position_accuracy_m`, `_tripod_height_m`, `_landmarks_visible`, ...), `sync_events[]` and `landmarks[]`.
`heading/elev/roll` are phone-sensor sanity values only; `landmark_calibrate.py --save` replaces them.
`alt` is the averaged GNSS altitude plus the tripod head height.

Other exports: full log JSON (everything in localStorage) and `landmarks.csv` (`name,lat,lon,alt`) for
`landmark_calibrate.py --landmarks`.

## Privacy

All data is stored in the browser's localStorage. Nothing is uploaded anywhere. Export and transfer files manually via
the Share sheet (iOS/Android) or direct download.

## Testing

`node tools/field_logger/test_builder.js tools/field_logger/index.html out.json` syntax-checks every script block,
unit-tests the pure builder (`window.pvflBuild.recipe/problems/landmarksCsv`) and writes a sample recipe to `out.json`.
