# Reference sources

These are design references, not drop-in Lambda-Sim plugins.

- `gym-pybullet-drones`, commit `f83fbdd4ee1c07e1afa52694963f3a9a889a0f56`: Crazyflie parameters and task/action comparison. The default learning example uses one-dimensional RPM; it does not establish XYZ disturbance rejection.
- `NeuralIMC`, commit `28b205d511089fbb402f9b0ee78c8931692195b5`: `MPPIResRL` implements additive PPO and MPPI actions. Its branch needs configuration and debugger cleanup before claiming reproducibility; its wind is an equivalent acceleration disturbance.
- `DATT`, commit `42ddfc8ccf1afe416c50b8e6d37864d70ce18af0`: PPO, trajectory tracking, wind adaptation, L1/RMA, PID and MPPI comparisons.
- `SimpleFlight`: 2025 CTBR policy with system identification, randomization, and retained rate control.
- `Learning to Fly in Seconds`, commit `d401e35d810566f6282dbc9d8af4e17025ab627f`: MIT-licensed TD3 route with direct motor RPM output and Crazyflie hardware procedures.
- Crazyflie firmware Mellinger controller and Python commander: future hardware interface references for full-state position, velocity, acceleration, attitude, and rate setpoints.

All source commits and hardware results must be recorded per experiment. A paper result or repository README is not evidence that the same behavior works in Lambda-Sim.
