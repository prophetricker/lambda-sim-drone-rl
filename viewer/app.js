import * as THREE from 'https://esm.sh/three@0.180.0';
import { OrbitControls } from 'https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js';

const $ = (id) => document.getElementById(id);
const duration = 30;
const dt = 0.1;
const sampleCount = Math.round(duration / dt) + 1;
const params = new URLSearchParams(location.search);
const isDemo = !params.has('run');
let frames = makeDemoFrames();
let playbackTime = 0;
let playing = false;
let lastTick = 0;
let previousFrame = null;
const seriesVisibility = { position: true, disturbance: true, residual: true };

function makeDemoFrames() {
  return Array.from({ length: sampleCount }, (_, index) => {
    const t = index * dt;
    const onset = Math.max(0, t - 8.2);
    const pulse = t > 8.2 && t < 14.5 ? Math.sin(Math.PI * (t - 8.2) / 6.3) ** 2 : 0;
    const gust = 1.05 * pulse;
    const x = 0.018 * Math.sin(t * 0.75) + 0.028 * Math.exp(-onset / 5) * Math.sin(onset * 1.35);
    const y = t < 8.2 ? 0.012 * Math.sin(t * 0.55) : 0.135 * Math.exp(-onset / 3.6) * (1 - Math.exp(-onset / 0.65)) + 0.01 * Math.sin(t * 0.9);
    const z = 1 + 0.012 * Math.sin(t * 0.62) - 0.025 * pulse;
    const residualY = -0.88 * gust + 0.09 * Math.sin(t * 1.2);
    const residualX = -0.14 * Math.sin(t * 0.8);
    const pitch = THREE.MathUtils.clamp(-Math.atan2(residualY, 9.81) * 0.9, -0.16, 0.16);
    const roll = THREE.MathUtils.clamp(Math.atan2(residualX, 9.81), -0.12, 0.12);
    return {
      time_s: t,
      position_m: [x, y, z],
      target_m: [0, 0, 1],
      velocity_m_s: [0.012 * Math.cos(t * 0.75), t < 8.2 ? 0 : -0.038 * Math.exp(-onset / 3.6), 0.007 * Math.cos(t * 0.62)],
      attitude_rpy_rad: [roll, pitch, 0.12 * Math.sin(t * 0.16)],
      disturbance_accel_m_s2: [0.12 * Math.sin(t * 0.8), gust, 0],
      base_accel_m_s2: [0.08 * Math.sin(t * 0.7), 0.18 * Math.sin(t * 0.6), -0.02 * Math.sin(t * 0.62)],
      residual_accel_m_s2: [residualX, residualY, 0.025 * Math.sin(t * 1.3)],
      reward: 0.91 - 0.27 * pulse + 0.025 * Math.sin(t * 0.3),
      episode_return: 25.84,
      terminated: false,
      truncated: false
    };
  });
}

function setupScene() {
  const root = $('scene');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e6ecec');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  camera.position.set(2.0, 1.9, 2.8);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  root.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.9, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.5;
  controls.maxDistance = 12;

  scene.add(new THREE.HemisphereLight('#f9ffff', '#aab9bc', 2.0));
  const keyLight = new THREE.DirectionalLight('#fff6e8', 2.3);
  keyLight.position.set(-3, -4, 7);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight('#ccebe2', 1.0);
  fillLight.position.set(5, 2, 3);
  scene.add(fillLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: '#d7e0df', roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.012;
  scene.add(floor);
  const grid = new THREE.GridHelper(12, 24, '#8fa2a3', '#c0cdcc');
  grid.position.y = 0.002;
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  // A readable Crazyflie-scale frame, with four individually visible motors.
  const drone = new THREE.Group();
  scene.add(drone);
  const bodyAxes = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const dark = new THREE.MeshStandardMaterial({ color: '#273236', metalness: 0.42, roughness: 0.38 });
  const teal = new THREE.MeshStandardMaterial({ color: '#168f84', metalness: 0.18, roughness: 0.42 });
  const orange = new THREE.MeshStandardMaterial({ color: '#e48a4c', metalness: 0.12, roughness: 0.45 });
  const armGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.43, 10);
  for (const rotation of [Math.PI / 4, -Math.PI / 4]) {
    const arm = new THREE.Mesh(armGeo, dark);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = rotation;
    drone.add(arm);
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.085, 0.045), dark);
  body.position.z = 0.012;
  drone.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.027, 0.022), orange);
  nose.position.set(0.045, 0, 0.03);
  drone.add(nose);
  const motorGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.026, 20);
  const propGeometry = new THREE.CylinderGeometry(0.092, 0.092, 0.003, 40);
  const motorPositions = [[0.14, 0.14], [0.14, -0.14], [-0.14, 0.14], [-0.14, -0.14]];
  for (let i = 0; i < motorPositions.length; i += 1) {
    const [x, y] = motorPositions[i];
    const motor = new THREE.Mesh(motorGeometry, i === 0 ? orange : dark);
    motor.position.set(x, y, 0.013);
    drone.add(motor);
    const prop = new THREE.Mesh(propGeometry, teal.clone());
    prop.material.transparent = true;
    prop.material.opacity = 0.42;
    prop.position.set(x, y, 0.03);
    drone.add(prop);
  }
  const landingSkid = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.01), dark);
  landingSkid.position.z = -0.04;
  drone.add(landingSkid);

  const target = new THREE.Group();
  const targetRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.006, 8, 64), new THREE.MeshBasicMaterial({ color: '#d9793d' }));
  targetRing.rotation.x = Math.PI / 2;
  targetRing.position.y = 0.025;
  target.add(targetRing);
  const targetDot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), new THREE.MeshBasicMaterial({ color: '#d9793d' }));
  targetDot.position.y = 0.026;
  target.add(targetDot);
  scene.add(target);

  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(300 * 3), 3));
  const trail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ color: '#168f84', transparent: true, opacity: 0.72 }));
  trail.frustumCulled = false;
  scene.add(trail);

  const forceArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0), 0.4, '#c34f43', 0.09, 0.055);
  scene.add(forceArrow);
  const resize = () => {
    const width = Math.max(1, root.clientWidth);
    const height = Math.max(1, root.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(root);
  resize();
  return { scene, camera, renderer, controls, drone, target, trail, forceArrow, targetRing, bodyAxes };
}

const view = setupScene();

function frameAt(time) {
  const index = Math.min(frames.length - 1, Math.max(0, time / (frames[1]?.time_s - frames[0]?.time_s || dt)));
  const low = Math.floor(index);
  const high = Math.min(frames.length - 1, low + 1);
  const mix = index - low;
  return interpolate(frames[low], frames[high], mix);
}

function interpolate(a, b, t) {
  const result = { ...a, time_s: a.time_s + (b.time_s - a.time_s) * t };
  for (const key of ['position_m', 'velocity_m_s', 'attitude_rpy_rad', 'disturbance_accel_m_s2', 'base_accel_m_s2', 'residual_accel_m_s2']) {
    result[key] = a[key].map((value, index) => value + (b[key][index] - value) * t);
  }
  return result;
}

function updateTrail(time) {
  const attr = view.trail.geometry.getAttribute('position');
  const last = Math.min(frames.length - 1, Math.floor(time / (frames[1]?.time_s - frames[0]?.time_s || dt)));
  const first = Math.max(0, last - 299);
  const count = last - first + 1;
  for (let i = 0; i < count; i += 1) {
    const p = frames[first + i].position_m;
    attr.setXYZ(i, p[0], p[2], -p[1]);
  }
  attr.needsUpdate = true;
  view.trail.geometry.setDrawRange(0, count);
}

function signed(value) { return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`; }
function fixed(value) { return value.toFixed(3); }

function updateBar(id, value, max = 1.5) {
  const percent = Math.min(100, Math.abs(value) / max * 100);
  $(id).style.width = `${percent}%`;
}

function updateFrame(time) {
  playbackTime = THREE.MathUtils.clamp(time, 0, frames.at(-1).time_s);
  const sample = frameAt(playbackTime);
  const [x, y, z] = sample.position_m;
  const [tx, ty, tz] = sample.target_m || [0, 0, 1];
  const [vx, vy, vz] = sample.velocity_m_s || [0, 0, 0];
  const [roll, pitch, yaw] = sample.attitude_rpy_rad || [0, 0, 0];
  const disturbance = sample.disturbance_accel_m_s2 || [0, 0, 0];
  const base = sample.base_accel_m_s2 || [0, 0, 0];
  const residual = sample.residual_accel_m_s2 || [0, 0, 0];
  view.drone.position.set(x, z, -y);
  const bodyRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(roll, pitch, yaw, 'ZYX'));
  view.drone.quaternion.copy(view.bodyAxes).multiply(bodyRotation);
  view.target.position.set(tx, tz, -ty);
  const force = new THREE.Vector3(disturbance[0], disturbance[2], -disturbance[1]);
  const length = THREE.MathUtils.clamp(force.length() * 0.38, 0.04, 0.8);
  if (force.length() < 0.005 || $('showVectors').checked === false) {
    view.forceArrow.visible = false;
  } else {
    view.forceArrow.visible = true;
    force.normalize();
    view.forceArrow.position.set(x, z + 0.17, -y);
    view.forceArrow.setDirection(force);
    view.forceArrow.setLength(length, Math.min(0.12, length * 0.34), Math.min(0.07, length * 0.2));
  }
  view.trail.visible = $('showTrail').checked;
  view.targetRing.material.opacity = 0.72 + 0.18 * Math.sin(playbackTime * 2);
  updateTrail(playbackTime);

  const errors = [x - tx, y - ty, z - tz];
  $('actualX').textContent = fixed(x); $('actualY').textContent = fixed(y); $('actualZ').textContent = fixed(z);
  $('errorX').textContent = signed(errors[0]); $('errorY').textContent = signed(errors[1]); $('errorZ').textContent = signed(errors[2]);
  $('velocity').textContent = fixed(Math.hypot(vx, vy, vz)); $('speed').textContent = fixed(Math.hypot(vx, vy, vz));
  $('attitude').innerHTML = `R ${THREE.MathUtils.radToDeg(roll).toFixed(1)}° <i>·</i> P ${THREE.MathUtils.radToDeg(pitch).toFixed(1)}°`;
  $('xyError').innerHTML = `${Math.hypot(errors[0], errors[1]).toFixed(3)} <small>m</small>`;
  $('simTime').textContent = `${String(Math.floor(playbackTime / 60)).padStart(2, '0')}:${String(Math.floor(playbackTime % 60)).padStart(2, '0')}.${Math.floor((playbackTime % 1) * 10)}`;
  $('altitude').textContent = `${z.toFixed(2)} m`;
  $('elapsedLabel').textContent = `${playbackTime.toFixed(1)} s`;
  $('timeline').value = String(Math.round(playbackTime / frames.at(-1).time_s * 1000));
  $('timeline').style.setProperty('--progress', `${playbackTime / frames.at(-1).time_s * 100}%`);
  const plotBounds = $('plot').getBoundingClientRect();
  $('plotCursor').style.left = `${47 + (plotBounds.width - 64) * playbackTime / frames.at(-1).time_s}px`;
  $('baseValue').textContent = signed(base[1]); $('residualValue').textContent = signed(residual[1]); $('disturbanceValueNow').textContent = signed(disturbance[1]);
  updateBar('baseBar', base[1]); updateBar('residualBar', residual[1]); updateBar('disturbanceBar', disturbance[1]);
  const values = frames.map((frame) => Math.hypot(frame.position_m[0] - tx, frame.position_m[1] - ty));
  $('maxDrift').textContent = `${Math.max(...values).toFixed(3)} m`;
  const rmse = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
  $('rmse').textContent = `${rmse.toFixed(3)} m`;
  $('episodeReturn').textContent = sample.episode_return == null ? '—' : Number(sample.episode_return).toFixed(2);
  drawPlot();
  previousFrame = sample;
}

function drawPlot() {
  const canvas = $('plot');
  const bounds = canvas.getBoundingClientRect();
  const scale = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  const left = 105 * scale, right = 17 * scale, top = 10 * scale, bottom = 22 * scale;
  const chartWidth = width - left - right, chartHeight = height - top - bottom;
  const css = getComputedStyle(document.documentElement);
  const grid = css.getPropertyValue('--line').trim();
  const muted = css.getPropertyValue('--muted').trim();
  const colors = { position: css.getPropertyValue('--blue').trim(), disturbance: css.getPropertyValue('--red').trim(), residual: css.getPropertyValue('--teal').trim() };
  const series = [
    { name: 'position', color: colors.position, value: (f) => f.position_m[1], min: -0.12, max: 0.22, label: 'Y position · m' },
    { name: 'disturbance', color: colors.disturbance, value: (f) => f.disturbance_accel_m_s2[1], min: -1.5, max: 1.5, label: 'Disturbance · m/s²' },
    { name: 'residual', color: colors.residual, value: (f) => f.residual_accel_m_s2[1], min: -1.5, max: 1.5, label: 'RL residual · m/s²' }
  ];
  ctx.font = `${9 * scale}px ${getComputedStyle(document.body).fontFamily}`;
  ctx.textBaseline = 'middle';
  const laneGap = 5 * scale;
  const laneHeight = (chartHeight - 2 * laneGap) / 3;
  series.forEach((item, seriesIndex) => {
    if (!seriesVisibility[item.name]) return;
    const laneTop = top + seriesIndex * (laneHeight + laneGap);
    const laneBottom = laneTop + laneHeight;
    for (let row = 0; row <= 2; row += 1) {
      const y = laneTop + row * laneHeight / 2;
      ctx.strokeStyle = grid; ctx.lineWidth = scale; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
    }
    const zeroY = laneTop + item.max / (item.max - item.min) * laneHeight;
    ctx.strokeStyle = '#aebbbb'; ctx.setLineDash([2 * scale, 3 * scale]); ctx.beginPath(); ctx.moveTo(left, zeroY); ctx.lineTo(width - right, zeroY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = muted; ctx.textAlign = 'left'; ctx.fillText(item.label, 5 * scale, laneTop + 8 * scale);
    ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.fillText(item.max.toFixed(item.max < 1 ? 2 : 1), left - 7 * scale, laneTop + 4 * scale);
    ctx.fillText(item.min.toFixed(item.min < 1 ? 2 : 1), left - 7 * scale, laneBottom - 4 * scale);
    ctx.strokeStyle = item.color; ctx.lineWidth = 1.65 * scale; ctx.beginPath();
    frames.forEach((frame, index) => {
      const x = left + index / (frames.length - 1) * chartWidth;
      const value = item.value(frame);
      const y = laneTop + (item.max - value) / (item.max - item.min) * laneHeight;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  for (let index = 0; index <= 3; index += 1) {
    const x = left + index / 3 * chartWidth;
    ctx.fillStyle = muted; ctx.textAlign = index === 0 ? 'left' : index === 3 ? 'right' : 'center';
    ctx.fillText(`${(frames.at(-1).time_s * index / 3).toFixed(0)} s`, x, height - 9 * scale);
  }
  const eventX = left + 8.2 / frames.at(-1).time_s * chartWidth;
  ctx.strokeStyle = '#bc6653'; ctx.setLineDash([3 * scale, 3 * scale]); ctx.beginPath(); ctx.moveTo(eventX, top); ctx.lineTo(eventX, height - bottom); ctx.stroke(); ctx.setLineDash([]);
}

function animate(timestamp) {
  requestAnimationFrame(animate);
  if (playing && lastTick) {
    const elapsed = Math.min(100, timestamp - lastTick) / 1000;
    const next = playbackTime + elapsed * Number($('playbackSpeed').value);
    if (next >= frames.at(-1).time_s) { updateFrame(frames.at(-1).time_s); playing = false; updatePlayButton(); }
    else updateFrame(next);
  }
  lastTick = timestamp;
  view.controls.update();
  view.renderer.render(view.scene, view.camera);
}

function updatePlayButton() {
  $('playPause').textContent = playing ? 'Ⅱ' : '▶';
  $('playPause').setAttribute('aria-label', playing ? 'Pause replay' : 'Play replay');
  $('playPause').dataset.tip = playing ? 'Pause replay' : 'Play replay';
  $('runStatus').textContent = playing ? 'PLAYING REPLAY' : 'REPLAY READY';
}

function setDataset(document, sourceName = 'uploaded run') {
  const incoming = document.frames || document.samples;
  if (!Array.isArray(incoming) || incoming.length < 2) throw new Error('Run JSON needs at least two frames.');
  const normalized = incoming.map((row, index) => {
    const position = row.position_m || row.position;
    if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)) throw new Error(`Frame ${index} has an invalid position_m.`);
    return {
      ...row,
      time_s: Number(row.time_s ?? row.simulation_time_s ?? index * dt),
      position_m: position,
      target_m: row.target_m || document.target_m || [0, 0, 1],
      velocity_m_s: row.velocity_m_s || row.velocity || [0, 0, 0],
      attitude_rpy_rad: row.attitude_rpy_rad || [0, 0, 0],
      disturbance_accel_m_s2: row.disturbance_accel_m_s2 || [0, 0, 0],
      base_accel_m_s2: row.base_accel_m_s2 || [0, 0, 0],
      residual_accel_m_s2: row.residual_accel_m_s2 || [0, 0, 0]
    };
  });
  if (normalized.some((row, index) => !Number.isFinite(row.time_s) || (index > 0 && row.time_s <= normalized[index - 1].time_s))) throw new Error('Frame timestamps must increase strictly.');
  frames = normalized;
  playbackTime = 0; playing = false; updatePlayButton();
  $('runName').textContent = document.run_id || sourceName;
  $('seedValue').textContent = document.seed ?? '—';
  $('controllerValue').textContent = document.controller || 'not specified';
  $('checkpointValue').textContent = document.checkpoint || 'not specified';
  $('disturbanceValue').textContent = document.disturbance_case || 'not specified';
  $('dataBadge').textContent = 'RECORDED RUN'; $('dataBadge').classList.add('recorded-badge');
  $('sceneWatermark').textContent = 'RECORDED STATES · RENDERED REPLAY';
  $('sourceLabel').textContent = `Source: ${sourceName}`;
  $('durationLabel').textContent = `${frames.at(-1).time_s.toFixed(1)} s`;
  $('timeline').value = '0';
  updateFrame(0);
}

function bindControls() {
  $('playPause').addEventListener('click', () => {
    if (playbackTime >= frames.at(-1).time_s) updateFrame(0);
    playing = !playing; updatePlayButton();
  });
  $('stepBack').addEventListener('click', () => { playing = false; updatePlayButton(); updateFrame(playbackTime - 0.1); });
  $('stepForward').addEventListener('click', () => { playing = false; updatePlayButton(); updateFrame(playbackTime + 0.1); });
  $('timeline').addEventListener('input', (event) => updateFrame(Number(event.target.value) / 1000 * frames.at(-1).time_s));
  $('showTrail').addEventListener('change', () => { view.trail.visible = $('showTrail').checked; });
  $('showVectors').addEventListener('change', () => updateFrame(playbackTime));
  $('resetCamera').addEventListener('click', () => {
    view.camera.position.set(2.0, 1.9, 2.8); view.controls.target.set(0, 0.9, 0); view.controls.update();
  });
  $('openRun').addEventListener('click', () => $('runFile').click());
  $('runFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { setDataset(JSON.parse(await file.text()), file.name); }
    catch (error) { alert(`Could not open run: ${error.message}`); }
    event.target.value = '';
  });
  document.querySelectorAll('[data-series]').forEach((input) => input.addEventListener('change', () => {
    seriesVisibility[input.dataset.series] = input.checked; drawPlot();
  }));
  window.addEventListener('resize', drawPlot);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName)) { event.preventDefault(); $('playPause').click(); }
    if (event.code === 'ArrowLeft') $('stepBack').click();
    if (event.code === 'ArrowRight') $('stepForward').click();
  });
}

bindControls();
$('durationLabel').textContent = `${frames.at(-1).time_s.toFixed(1)} s`;
if (!isDemo) fetch(params.get('run')).then((response) => {
  if (!response.ok) throw new Error(`Run fetch returned ${response.status}`);
  return response.json();
}).then((document) => setDataset(document, params.get('run'))).catch((error) => {
  $('runStatus').textContent = 'RUN LOAD FAILED'; $('sourceLabel').textContent = error.message;
});
updateFrame(0);
requestAnimationFrame(animate);
