// Extract every <script> block from index.html, syntax-check each, then exercise the pure builder.
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(process.argv[2], 'utf8');
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log('script blocks:', blocks.length);
for (const [i, b] of blocks.entries()) {
  new vm.Script(b, { filename: 'block' + i + '.js' });   // throws on syntax error
  console.log('block', i, 'parses OK,', b.length, 'chars');
}
// Run the builder block (block 0) in a bare context
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(blocks[0], ctx);
const B = ctx.pvflBuild;
if (!B) throw new Error('pvflBuild not defined');

const data = {
  positions: [
    { label: 'cam0 tripod', lat: 43.68300, lon: -79.59000, alt: 173.2, accuracy_m: 3.1, n_samples: 120 },
    { label: 'cam1 tripod', lat: 43.68410, lon: -79.58830, alt: 174.0, accuracy_m: 2.8, n_samples: 140 },
  ],
  orientations: [{ label: 'cam0 aim', heading: 52.3, pitch: 6.1, roll: -0.4 }],
  landmarks: [
    { name: 'Runway 05 threshold', lat: 43.6702, lon: -79.6120, alt: 170, accuracy_m: 0, manual: true },
    { name: 'Tower', lat: 43.6770, lon: -79.6300, alt: 230, accuracy_m: 0, manual: true },
  ],
  cameras: [
    { label: 'iphone15', device: 'iPhone 15', app: 'Blackmagic 4K30', fov_degrees: '68.2', fov_source: 'tape test', fps: '29.97',
      position_idx: 0, orient_idx: 0, on_axis_landmark: 'Tower', landmarks_visible: ['Tower', 'Runway 05 threshold'],
      tripod_height_m: '1.4', stabilisation_off: true, exposure_locked: true, focus_locked: true, notes: '' },
    { label: 'pixel8', device: 'Pixel 8', app: 'Open Camera 4K30', fov_degrees: '', fov_source: '', fps: '30',
      position_idx: 1, orient_idx: null, on_axis_landmark: '', landmarks_visible: [], tripod_height_m: '',
      stabilisation_off: false, exposure_locked: true, focus_locked: false, notes: 'behind glass' },
  ],
  sync_events: [
    { kind: 'record_start', utc: '2026-09-20T14:02:50.120Z', unix_ms: 1789999370120, camera_label: 'iphone15' },
    { kind: 'start', utc: '2026-09-20T14:03:23.900Z', unix_ms: 1789999403900, note: 'board drop at path fork' },
    { kind: 'end', utc: '2026-09-20T14:33:01.250Z', unix_ms: 1790001181250, note: '' },
  ],
  session: { site: 'Danville Terminal park', weather: 'overcast, 10 kt W', adsb_capture: true, adsb_source: 'dump1090 laptop', notes: '' },
};
data.sync_events.forEach(e => { e.unix_ms = Date.parse(e.utc); });
const r = B.recipe(data);
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };
assert(r.sync_event_utc === '2026-09-20T14:03:23.900Z', 'sync_event_utc from first start event');
assert(r.cameras.length === 2 && r.cameras[0].camera_index === 0 && r.cameras[1].camera_index === 1, 'camera indices');
assert(r.cameras[0].video_file === 'iphone15.mp4', 'video_file from label');
assert(Math.abs(r.cameras[0].alt - 174.6) < 1e-9, 'alt = tripod position + head height');
assert(r.cameras[1].alt === 174.0, 'alt without tripod height');
assert(r.cameras[0].heading === 52.3 && r.cameras[0].elev === 6.1 && r.cameras[0].roll === -0.4, 'orientation sanity values');
assert(r.cameras[1].heading === 0 && r.cameras[1].elev === 0, 'no orientation -> zeros');
assert(r.cameras[0].fov_degrees === 68.2 && r.cameras[1].fov_degrees === null, 'fov');
assert(r.cameras[0].start_time_utc === '2026-09-20T14:02:50.120Z' && !('start_time_utc' in r.cameras[1]), 'start_time_utc only when stamped');
assert(!('sync_event_seconds' in r.cameras[0]), 'sync_event_seconds must be absent (filled from video later)');
assert(r.anchor_camera === 0 && r.target_fps === 29.97 && r.frame_width === 1280, 'globals');
assert(r.grid.voxel_size === 20, 'grid default');
assert(r.session.adsb_capture === true && r.session.date_utc === '2026-09-20', 'session');
const csv = B.landmarksCsv(data).split(String.fromCharCode(10));
assert(csv[0] === 'name,lat,lon,alt' && csv[1] === 'Runway 05 threshold,43.6702,-79.612,170', 'landmarks csv');
const p = B.problems(data);
console.log('problems:', p);
assert(p.some(x => x.includes('pixel8') && x.includes('FOV')), 'missing FOV flagged');
assert(p.some(x => x.includes('stabilisation')), 'stab flagged');
assert(p.some(x => x.includes('fewer than 5 landmarks')), 'landmark count flagged');
assert(!p.some(x => x.includes('sync event')), 'start event present');
// JSON round-trips and ingest-required keys present
const j = JSON.parse(JSON.stringify(r));
for (const k of ['cameras', 'sync_event_utc', 'anchor_camera', 'target_fps', 'frame_width', 'grid']) assert(k in j, 'key ' + k);
for (const c of j.cameras) for (const k of ['label', 'video_file', 'camera_index', 'lat', 'lon', 'alt', 'heading', 'elev', 'roll', 'fov_degrees', 'detection_mode']) assert(k in c, 'cam key ' + k);
console.log('builder tests: all passed');
console.log(JSON.stringify(r, null, 1).slice(0, 900));
fs.writeFileSync(process.argv[3], JSON.stringify(r, null, 2));
