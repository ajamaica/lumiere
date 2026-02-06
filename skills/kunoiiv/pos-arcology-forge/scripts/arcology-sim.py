import json
import sys
import math

def validate_params(params):
    required = ['radius_km', 'pop_m']
    for k in required:
        if k not in params:
            raise ValueError(f'Missing param: {k}')
    params['radius_km'] = max(0.5, min(50, params['radius_km']))
    params['pop_m'] = max(1000, min(1e10, params['pop_m']))
    params.setdefault('fusion_gw', 1)
    params.setdefault('exosuits', 1.2)
    return params

def sim_arcology(radius_km=5, pop_m=1000000, fusion_gw=1, exosuits=1.2, length_km=10):
    radius = radius_km * 1000  # m
    g_target = 0.21
    omega = math.sqrt(g_target / radius)
    volume_m3 = math.pi * radius**2 * (length_km * 1000)
    habitat_per_person = 100
    pop_cap = volume_m3 / habitat_per_person / 1e6
    stability = min(1.0, max(0.0, fusion_gw / (pop_m * 1e-6)))
    density = pop_m / (volume_m3 / 1e9)
    return {
        'cyl_radius_km': radius_km,
        'length_km': length_km,
        'pop_m': pop_m,
        'stability': round(stability, 2),
        'density_km3': round(density, 1),
        'rotation_rads': round(omega, 3),
        'pop_cap_m': round(pop_cap, 1),
        'exosuit_load': round(pop_m * exosuits, 0),
        'tags': ['elysium', 'oneill']
    }

if __name__ == '__main__':
    params = {}
    if len(sys.argv) > 1:
        try:
            params = json.loads(sys.argv[1])
        except:
            print('Invalid JSON', file=sys.stderr)
            sys.exit(1)
    try:
        params = validate_params(params)
        sim = sim_arcology(**params)
        print(json.dumps(sim))
    except ValueError as e:
        print(f'Invalid params: {e}', file=sys.stderr)
        sys.exit(1)
