#!/usr/bin/env python3
"""
View bookings tool for SRT skill.
Lists all current reservations.
"""

import sys
import argparse
from utils import (
    load_credentials,
    handle_error,
    output_json,
    format_reservation_info,
    print_table
)


def view_bookings(credentials):
    """
    View all current reservations.

    Args:
        credentials: dict with phone and password

    Returns:
        list: List of reservation objects
    """
    from SRT import SRT

    print("📋 예약 조회 중...")
    srt = SRT(credentials['phone'], credentials['password'])

    reservations = srt.get_reservations()

    return reservations


def _display_results(reservations, fmt='table'):
    """Display reservation results."""
    if not reservations:
        print("\n📭 현재 예약이 없습니다.")
        output_json([], success=True)
        return

    print(f"\n✅ {len(reservations)}개의 예약을 찾았습니다.\n")

    if fmt == 'table':
        headers = ["예약번호", "날짜", "시간", "출발", "도착", "열차", "좌석", "결제"]
        rows = []
        for res in reservations:
            payment_status = "필요" if getattr(res, 'payment_required', True) else "완료"
            rows.append([
                getattr(res, 'reservation_number', 'N/A'),
                getattr(res, 'journey_date', 'N/A'),
                getattr(res, 'journey_time', 'N/A'),
                getattr(res, 'dep_station_name', 'N/A'),
                getattr(res, 'arr_station_name', 'N/A'),
                getattr(res, 'train_number', 'N/A'),
                getattr(res, 'seat_number', 'N/A'),
                payment_status
            ])

        print_table(headers, rows)

        unpaid = [r for r in reservations if getattr(r, 'payment_required', True)]
        if unpaid:
            print(f"\n⚠️  결제가 필요한 예약이 {len(unpaid)}개 있습니다.")
            print("   SRT 앱 또는 웹사이트에서 결제를 완료해주세요.")

    json_data = [format_reservation_info(res) for res in reservations]
    output_json(json_data, success=True)


def run(args):
    """Run list with pre-parsed args from srt_cli.py."""
    try:
        credentials = load_credentials()
        reservations = view_bookings(credentials)
        fmt = getattr(args, 'format', 'table')
        _display_results(reservations, fmt=fmt)
        sys.exit(0)
    except Exception as e:
        error_info = handle_error(e, context="list")
        output_json(error_info, success=False)
        sys.exit(2)


def main():
    parser = argparse.ArgumentParser(description="SRT 예약 목록 조회")
    parser.add_argument('--format', choices=['table', 'json'], default='table',
                        help="출력 형식 (table 또는 json)")
    run(parser.parse_args())


if __name__ == "__main__":
    main()
