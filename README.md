# Lambda-Sim Drone RL

Lambda-Sim based research on deployable three-dimensional quadrotor position holding and disturbance rejection.

The first reference platform is the Crazyflie 2.1. F450 is deliberately not a hard dependency: the simulator adapter and control contracts should support other quadrotor assets when their parameters and geometry are available.

## Research objective

Build a reproducible comparison between:

1. an integral position/geometric controller;
2. the same controller with a disturbance observer or L1 compensation;
3. the same controller with a bounded PPO residual policy.

The target is fixed XYZ position and yaw. The first result is a Lambda-Sim simulation result. It is not a claim of real-world wind performance until a real vehicle, localization system, radio timing, and failsafe behavior have been tested.

## Control contract

- Policy rate target: 50 Hz; physics and motor updates: 500 Hz.
- Policy action: bounded world-frame linear-acceleration residual `[dax, day, daz]` in `m/s^2`, excluding gravity.
- The residual is added to the nominal position-controller acceleration and passed through the attitude/thrust controller and four-motor mixer.
- Actor observations contain only deployable estimates: delayed/noisy position and velocity, attitude, angular rate, previous action, and short history.
- The actor must not read simulator wind, ground-truth velocity, motor internal state, or other privileged state.
- The initial reference is Crazyflie-compatible Mellinger control and full-state acceleration feed-forward semantics.

## Repository layout

```text
docs/                 design notes and source audits
src/lambda_drone/     simulator adapter, dynamics, controllers, environments
configs/              pinned experiment configurations
tests/                CPU contract and regression tests
experiments/          small reproducible run manifests and summaries
```

Large checkpoints, videos, private manifests, credentials, and simulator bundles stay outside Git or in explicitly ignored paths.

## Status

This repository currently contains the project baseline and plan. No Lambda-Sim quadrotor training run has been claimed yet.

See [`docs/PLAN.md`](docs/PLAN.md) for the staged implementation and acceptance gates.
