# Naubiomech-Inspired Modular Leg Spec (Elysium Edition)

## Overview

- Purpose: Assist mobility in O'Neill spin-grav (1G @ 1RPM, Island Three). Compact 1.8m user, Coriolis-stabilized, replicator-printable.
- Inspo: [naubiomech/OpenExo](https://github.com/naubiomech/OpenExo) + [NAU](https://theopenexo.nau.edu/) (Science Robotics 2025).

| Metric | Value                      |
| ------ | -------------------------- |
| Height | 1.5-2m user                |
| Weight | 8kg/leg                    |
| Lift   | 50kg/leg                   |
| DoF    | 6 (hip:3, knee:1, ankle:2) |
| Power  | 48V 5Ah LiPo               |

## Mechanical

- Hip: 3DoF ball, direct drive.
- Knee: 1DoF Bowden.
- Ankle: 2DoF gimbal.
- Frame: CFRP, gyro (MPU6050) vs Coriolis (0.01g perturb).
- SVG Sketch: Hip Ø150mm → Knee 200mm → Ankle Ø100mm (900mm total).

## Actuators

- Motors: CubeMars AK70-10 x2 (hip/ankle), AK60-6 x2 (knee).
- Ctrl: STM32F4 CAN bus, encoders/IMUs/FSR.

## Software

```python
# Coriolis comp
torque_cmd += kf * cross(omega=0.1, leg_vel)
```

Clone: `git clone https://github.com/naubiomech/OpenExo`

## BOM (~$400/leg)

| Part    | Qty | Cost |
| ------- | --- | ---- |
| AK70-10 | 2   | $150 |
| AK60-6  | 2   | $100 |
| STM32   | 3   | $30  |
| CFRP    | 4m  | $20  |
| IMU     | 3   | $15  |
| LiPo    | 1   | $50  |
| Misc    | -   | $35  |

## Integration

- Factory: 50/day.
- Sim: 1G + Coriolis physics.
