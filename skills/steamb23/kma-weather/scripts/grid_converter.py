#!/usr/bin/env python3
"""
KMA Grid Coordinate Converter
Convert between latitude/longitude and KMA grid coordinates (nx, ny).

Based on official KMA conversion algorithm using Lambert Conformal Conic Projection.

References:
- KMA Official Algorithm: https://gist.github.com/fronteer-kr/14d7f779d52a21ac2f16
- Improved Implementation: https://blog.naver.com/seoulworkshop/222873041453
"""

import math
from typing import Tuple


# Lambert Conformal Conic Projection Constants
EARTH_RADIUS_KM = 6371.00877   # Earth radius (km)
GRID_SPACING_KM = 5.0          # Grid spacing (km)
PROJ_LAT_1 = 30.0              # Standard parallel 1 (degrees)
PROJ_LAT_2 = 60.0              # Standard parallel 2 (degrees)
REF_LON = 126.0                # Reference longitude (degrees)
REF_LAT = 38.0                 # Reference latitude (degrees)
REF_X = 43.0                   # Reference point X coordinate
REF_Y = 136.0                  # Reference point Y coordinate

DEGREE_TO_RADIAN = math.pi / 180.0
GRID_UNIT_COUNT = EARTH_RADIUS_KM / GRID_SPACING_KM


def latlon_to_grid(lat: float, lon: float) -> Tuple[int, int]:
    """
    Convert latitude/longitude to KMA grid coordinates.

    Args:
        lat: Latitude (degrees)
        lon: Longitude (degrees)

    Returns:
        Tuple[int, int]: (nx, ny) grid coordinates

    Example:
        >>> latlon_to_grid(37.5665, 126.9780)  # Seoul City Hall
        (60, 127)
    """
    # Convert to radians
    proj_lat_1_rad = PROJ_LAT_1 * DEGREE_TO_RADIAN
    proj_lat_2_rad = PROJ_LAT_2 * DEGREE_TO_RADIAN
    ref_lon_rad = REF_LON * DEGREE_TO_RADIAN
    ref_lat_rad = REF_LAT * DEGREE_TO_RADIAN
    lat_rad = lat * DEGREE_TO_RADIAN
    lon_rad = lon * DEGREE_TO_RADIAN

    # Calculate projection parameters
    sn = math.log(math.cos(proj_lat_1_rad) / math.cos(proj_lat_2_rad)) / \
         math.log(math.tan(math.pi * 0.25 + proj_lat_2_rad * 0.5) /
                  math.tan(math.pi * 0.25 + proj_lat_1_rad * 0.5))

    sf = math.pow(math.tan(math.pi * 0.25 + proj_lat_1_rad * 0.5), sn) * \
         math.cos(proj_lat_1_rad) / sn

    ro = GRID_UNIT_COUNT * sf / math.pow(math.tan(math.pi * 0.25 + ref_lat_rad * 0.5), sn)

    # Calculate distance and angle
    distance = GRID_UNIT_COUNT * sf / math.pow(math.tan(math.pi * 0.25 + lat_rad * 0.5), sn)
    theta_rad = lon_rad - ref_lon_rad

    # Normalize theta to [-π, π]
    if theta_rad > math.pi:
        theta_rad -= 2.0 * math.pi
    if theta_rad < -math.pi:
        theta_rad += 2.0 * math.pi

    theta_rad *= sn

    # Calculate grid coordinates
    nx = int(distance * math.sin(theta_rad) + REF_X + 0.5)
    ny = int(ro - distance * math.cos(theta_rad) + REF_Y + 0.5)

    return nx, ny


def grid_to_latlon(nx: int, ny: int) -> Tuple[float, float]:
    """
    Convert KMA grid coordinates to latitude/longitude (inverse conversion).

    Args:
        nx: Grid X coordinate
        ny: Grid Y coordinate

    Returns:
        Tuple[float, float]: (latitude, longitude) in degrees

    Example:
        >>> grid_to_latlon(60, 127)  # Seoul City Hall
        (37.5665, 126.9780)
    """
    # Convert to radians
    proj_lat_1_rad = PROJ_LAT_1 * DEGREE_TO_RADIAN
    proj_lat_2_rad = PROJ_LAT_2 * DEGREE_TO_RADIAN
    ref_lon_rad = REF_LON * DEGREE_TO_RADIAN
    ref_lat_rad = REF_LAT * DEGREE_TO_RADIAN

    # Calculate projection parameters
    sn = math.log(math.cos(proj_lat_1_rad) / math.cos(proj_lat_2_rad)) / \
         math.log(math.tan(math.pi * 0.25 + proj_lat_2_rad * 0.5) /
                  math.tan(math.pi * 0.25 + proj_lat_1_rad * 0.5))

    sf = math.pow(math.tan(math.pi * 0.25 + proj_lat_1_rad * 0.5), sn) * \
         math.cos(proj_lat_1_rad) / sn

    ro = GRID_UNIT_COUNT * sf / math.pow(math.tan(math.pi * 0.25 + ref_lat_rad * 0.5), sn)

    # Calculate differences from reference point
    diff_x = nx - REF_X
    diff_y = ro - ny + REF_Y

    # Calculate distance
    distance = math.sqrt(diff_x * diff_x + diff_y * diff_y)
    if sn < 0.0:
        distance = -distance

    # Calculate latitude
    lat_rad = 2.0 * math.atan(math.pow(GRID_UNIT_COUNT * sf / distance, 1.0 / sn)) - math.pi * 0.5

    # Calculate longitude
    if abs(diff_x) <= 0.0:
        theta_rad = 0.0
    else:
        if abs(diff_y) <= 0.0:
            theta_rad = math.pi * 0.5 if diff_x >= 0.0 else -math.pi * 0.5
        else:
            theta_rad = math.atan2(diff_x, diff_y)

    lon_rad = theta_rad / sn + ref_lon_rad

    # Convert to degrees
    lat = lat_rad / DEGREE_TO_RADIAN
    lon = lon_rad / DEGREE_TO_RADIAN

    return lat, lon


if __name__ == "__main__":
    # Simple test with Seoul coordinates
    import sys

    if len(sys.argv) == 3:
        # Command-line usage: python grid_converter.py <lat> <lon>
        try:
            lat = float(sys.argv[1])
            lon = float(sys.argv[2])
            nx, ny = latlon_to_grid(lat, lon)
            print(f"Lat/Lon ({lat}, {lon}) -> Grid: ({nx}, {ny})")

            # Test inverse conversion
            lat_back, lon_back = grid_to_latlon(nx, ny)
            print(f"Grid ({nx}, {ny}) -> Lat/Lon: ({lat_back:.4f}, {lon_back:.4f})")
        except ValueError:
            print("Usage: python grid_converter.py <latitude> <longitude>")
            sys.exit(1)
    else:
        # Basic test
        print("Testing grid_converter.py")
        print("-" * 40)

        # Seoul City Hall
        lat, lon = 37.5665, 126.9780
        nx, ny = latlon_to_grid(lat, lon)
        print(f"Forward:  Lat/Lon ({lat}, {lon}) -> Grid ({nx}, {ny})")

        # Test inverse conversion
        lat_back, lon_back = grid_to_latlon(nx, ny)
        print(f"Inverse:  Grid ({nx}, {ny}) -> Lat/Lon ({lat_back:.4f}, {lon_back:.4f})")
        print(f"Error:    ({abs(lat - lat_back):.6f}, {abs(lon - lon_back):.6f})")

        print("\nUsage: python grid_converter.py <latitude> <longitude>")
