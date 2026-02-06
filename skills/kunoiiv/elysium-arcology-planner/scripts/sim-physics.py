#!/usr/bin/env python3
import sys
import json
import math
import numpy as np  # Assume numpy avail; fallback vec ops

def cross(a, b):
    return np.cross(a, b) if 'np' in globals() else [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]

def sim_physics(params):
    rpm = params.get('rpm', 1.0)  # O'Neill spin
    radius_km = params.get('radius_km', 4.0)  # Island Three
    omega = 2 * math.pi * rpm / 60  # rad/s
    r = radius_km * 1000  # m
    g = omega**2 * r  # Centripetal ~1G
    
    omega_vec = np.array([0, 0, omega])  # Spin axis Z
    leg_vel = np.array(params.get('leg_vel', [0, 1, 0]))  # m/s radial/tangential
    
    coriolis = 2 * cross(omega_vec, leg_vel)
    torque_est = np.linalg.norm(coriolis) * params.get('kf', 0.5)  # N.m extra
    
    power = g * params.get('mass_kg', 80) * 9.81 / 1000  # kW rough (lift equiv)
    
    return {
        'gravity_ms2': g,
        'coriolis_accel_ms2': np.linalg.norm(coriolis),
        'extra_torque_nm': torque_est,
        'power_kw': power,
        'hashrate_potential_ths': power * 30  # ASIC eff ~30 TH/s per kW
    }

if __name__ == '__main__':
    input_json = sys.stdin.read().strip()
    params = json.loads(input_json) if input_json else {'rpm':1, 'radius_km':4, 'leg_vel':[0,2,0], 'mass_kg':100, 'kf':1}
    print(json.dumps(sim_physics(params), indent=2))
