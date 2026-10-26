# Lambda-Sim Drone RL Plan

## Goal

Create a Crazyflie-reference quadrotor task in Lambda-Sim that holds `(x, y, z) = (0, 0, 1) m` under held-out disturbances, using interfaces that can later feed a real Crazyflie controller. The first milestone is simulation evidence, not a real-flight claim.

## Stage 1: plant and control contract

- Import or recreate a floating six-DoF Crazyflie body with four rotor thrust and reaction-torque channels.
- Bind mass, inertia, arm length, thrust coefficient, reaction-torque coefficient, motor first-order delay, mixer signs, and saturation limits to a versioned manifest.
- Implement the Mellinger-equivalent position, velocity, integral, gravity, attitude, thrust-limit, and motor-mixing path.
- Expose a batched Gym-style `reset(seed, options)` / `step(action)` environment and an action space of three acceleration residuals.
- Verify world-frame `+Z`, quaternion order, rotor numbering, force direction, and units with single-axis probes.

Gate: the nominal controller returns from small XYZ errors without NaNs, reset is isolated across environments, and all action/observation tensors have fixed documented shapes.

## Stage 2: deployable observation and timing model

- Add delayed and noisy position/velocity estimates, attitude and IMU noise, asynchronous sampling, state age, command delay, jitter, and sample-and-hold at 50 Hz.
- Keep simulator truth for scoring only; actor input must use the deployable estimate path.
- Record inference p99, state age, command period, and dropped or stale observations in replay tests.
- Model residual timeout behavior as residual zero plus continued nominal position reference. Treat complete radio/host loss as a separate failsafe question; do not assume automatic hover takeover.

Gate: an offline receive-observe-infer-pack-send replay passes finite-value, timestamp-age, delay, and unit checks.

## Stage 3: controllers and training

Train and compare these paired controllers with the same estimator, delay, limits, and motor model:

1. integral Mellinger baseline;
2. Mellinger plus disturbance observer/L1 compensation;
3. Mellinger plus bounded PPO residual.

Use the curriculum no disturbance -> constant/slowly varying equivalent acceleration -> held-out gusts and reverse steps. Start with horizontal disturbance up to `1.5 m/s^2` and vertical disturbance up to `0.3 m/s^2`; keep `2.0 m/s^2` as a separate stress test. Randomize mass, motor time constant, estimator noise, delays, and thrust margin.

Use one seed for a 1M-step pipeline smoke test, then three independent training seeds up to 5M steps. Select checkpoints only on a development set. RLinf is an optional batch trainer after the environment contract passes; it is not part of the controller safety path.

## Stage 4: frozen evaluation

Run 30-second episodes at the fixed target. Use 20 fixed initial-state seeds, each with no disturbance, constant side disturbance, reverse step, and smooth varying gust, for 80 paired episodes per controller. Keep initial states and disturbance sequences identical across methods.

Report XY RMSE, Z RMSE, maximum horizontal displacement, recovery time, residual/thrust saturation, tilt, and failure cause. Recovery means position error <= `0.05 m` and speed <= `0.1 m/s` continuously for 1 second. A failure is horizontal error > `0.5 m`, height outside `[0.3, 1.7] m`, tilt > `60 deg`, illegal contact, or numerical termination.

Primary success threshold: PPO improves held-out dynamic-disturbance paired XY RMSE by at least 20% against both baselines, all three training seeds improve in the same direction, no-disturbance XY/Z RMSE degradation is <=10%, and failures do not increase. A threshold failure remains a valid negative result.

## Deployment boundary

The future Crazyflie integration must verify, with hardware, external localization accuracy and delay, coordinate signs, acceleration feed-forward encoding, radio loss behavior, watchdog/stop behavior, and actual 50 Hz timing. Until then, the correct label is “deployment-oriented simulation validation”.

Equivalent external acceleration is recorded as force using `F = m * a`; it is not reported as a real wind speed. Blade-level aerodynamics and wind-tunnel validation are out of scope for the first milestone.
