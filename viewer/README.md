# Flight Review Viewer

Run the local preview from this repository root:

```bash
python3 -m http.server 4173 --directory viewer
```

Open <http://127.0.0.1:4173/>. The built-in deterministic scene is marked **SYNTHETIC PREVIEW** and is only for checking viewer interactions and layout; it is not a physics rollout or trained policy.

Use **Open run** to load a JSON replay. The reader accepts a top-level `frames` or `samples` array. Each frame uses this minimal shape:

```json
{
  "time_s": 0.0,
  "position_m": [0.0, 0.0, 1.0],
  "target_m": [0.0, 0.0, 1.0],
  "velocity_m_s": [0.0, 0.0, 0.0],
  "attitude_rpy_rad": [0.0, 0.0, 0.0],
  "disturbance_accel_m_s2": [0.0, 0.0, 0.0],
  "base_accel_m_s2": [0.0, 0.0, 0.0],
  "residual_accel_m_s2": [0.0, 0.0, 0.0]
}
```

The viewer interpolates between recorded frames for smooth playback; it does not integrate physics. Actual Lambda-Sim integration will export recorded qpos/qvel and synchronized telemetry to this viewer contract, then use the native renderer for the vehicle scene. Missing telemetry fields default to zero and must be added before interpreting control plots as experiment evidence.
