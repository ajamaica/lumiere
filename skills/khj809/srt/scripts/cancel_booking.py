#!/usr/bin/env python3
"""
Cancel booking tool for SRT skill.
Cancels a specific reservation.
"""

import sys
import argparse
from utils import (
    load_credentials,
    handle_error,
    output_json
)


def cancel_booking(credentials, args):
    """
    Cancel a specific reservation.

    Args:
        credentials: dict with phone and password
        args: argparse namespace with cancellation parameters

    Returns:
        Cancelled reservation object
    """
    from SRT import SRT

    print("🔍 예약 조회 중...")
    srt = SRT(credentials['phone'], credentials['password'])

    # Get all reservations
    reservations = srt.get_reservations()

    if not reservations:
        raise Exception("예약을 찾을 수 없습니다.")

    # Find reservation by ID
    reservation = None
    for res in reservations:
        if getattr(res, 'reservation_number', '') == args.reservation_id:
            reservation = res
            break

    if not reservation:
        raise Exception(
            f"예약번호 '{args.reservation_id}'를 찾을 수 없습니다.\n"
            "예약 목록을 확인하려면: python3 scripts/srt_cli.py list"
        )

    # Confirm cancellation
    if not getattr(args, 'confirm', False):
        print(f"\n⚠️  예약을 취소하시겠습니까?")
        print(f"   예약번호: {getattr(reservation, 'reservation_number', 'N/A')}")
        print(f"   열차번호: {getattr(reservation, 'train_number', 'N/A')}")
        print(f"   출발: {getattr(reservation, 'dep_station_name', 'N/A')} {getattr(reservation, 'journey_time', 'N/A')}")
        print(f"   도착: {getattr(reservation, 'arr_station_name', 'N/A')}")
        response = input("\n계속하려면 'yes' 입력: ")
        if response.lower() not in ['yes', 'y']:
            print("취소가 중단되었습니다.")
            sys.exit(0)

    # Cancel reservation
    print(f"\n🗑️  예약 취소 중...")
    srt.cancel(reservation)

    return reservation


def run(args):
    """Run cancellation with pre-parsed args from srt_cli.py."""
    try:
        credentials = load_credentials()
        reservation = cancel_booking(credentials, args)

        print("\n✅ 예약이 취소되었습니다.")
        print(f"   예약번호: {getattr(reservation, 'reservation_number', 'N/A')}")
        print(f"   열차번호: {getattr(reservation, 'train_number', 'N/A')}")

        json_data = {
            "success": True,
            "reservation_id": getattr(reservation, 'reservation_number', 'N/A'),
            "message": "Reservation cancelled successfully"
        }
        output_json(json_data, success=True)
        sys.exit(0)
    except Exception as e:
        error_info = handle_error(e, context="cancel")
        output_json(error_info, success=False)
        sys.exit(2)


def main():
    parser = argparse.ArgumentParser(description="SRT 예약 취소")
    parser.add_argument('--reservation-id', required=True, help="예약번호")
    parser.add_argument('--confirm', action='store_true', help="확인 없이 바로 취소")
    run(parser.parse_args())


if __name__ == "__main__":
    main()
