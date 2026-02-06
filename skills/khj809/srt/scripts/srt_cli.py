#!/usr/bin/env python3
"""
Main CLI router for SRT skill.
Routes commands to appropriate tool modules.
"""

import sys
import argparse


def main():
    parser = argparse.ArgumentParser(
        description="SRT (Korean Train Service) CLI",
        epilog="예시:\n"
               "  검색: python3 scripts/srt_cli.py search --departure 수서 --arrival 부산 --date 20260217 --time 140000\n"
               "  예약 (단일): python3 scripts/srt_cli.py reserve --train-id 1\n"
               "  예약 (재시도): python3 scripts/srt_cli.py reserve --retry --timeout-minutes 60\n"
               "  로그 확인: python3 scripts/srt_cli.py log -n 30\n"
               "  조회: python3 scripts/srt_cli.py list\n"
               "  취소: python3 scripts/srt_cli.py cancel --reservation-id RES123",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    subparsers = parser.add_subparsers(dest='command', help='사용 가능한 명령')

    # Search command
    search_parser = subparsers.add_parser('search', help='열차 검색')
    search_parser.add_argument('--departure', required=True, help='출발역 (한글)')
    search_parser.add_argument('--arrival', required=True, help='도착역 (한글)')
    search_parser.add_argument('--date', required=True, help='날짜 (YYYYMMDD)')
    search_parser.add_argument('--time', required=True, help='시간 (HHMMSS)')
    search_parser.add_argument('--passengers', help='승객 수 (예: adult=2)')

    # Reserve command
    reserve_parser = subparsers.add_parser('reserve', help='열차 예약')
    reserve_parser.add_argument('--train-id', 
                                help='열차 번호 (검색 결과의 순번, 쉼표로 복수 지정 가능, 생략 시 모든 열차 시도)')
    reserve_parser.add_argument('--retry', action='store_true',
                                help='실패 시 자동 재시도 (백그라운드 실행 권장)')
    reserve_parser.add_argument('--timeout-minutes', type=int, default=60,
                                help='최대 시도 시간 (분, 기본값: 60)')
    reserve_parser.add_argument('--wait-seconds', type=int, default=10,
                                help='재시도 대기 시간 (초, 기본값: 10)')

    # List command
    list_parser = subparsers.add_parser('list', help='예약 목록 조회')
    list_parser.add_argument('--format', choices=['table', 'json'], default='table',
                             help='출력 형식')

    # Cancel command
    cancel_parser = subparsers.add_parser('cancel', help='예약 취소')
    cancel_parser.add_argument('--reservation-id', required=True, help='예약번호')
    cancel_parser.add_argument('--confirm', action='store_true', help='확인 없이 바로 취소')

    # Check retry log command
    log_parser = subparsers.add_parser('log', help='예약 재시도 로그 확인')
    log_parser.add_argument('--lines', '-n', type=int, default=20,
                            help='표시할 라인 수 (기본값: 20)')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    try:
        # Route to appropriate tool with parsed args
        if args.command == 'search':
            from search_trains import run
            run(args)

        elif args.command == 'reserve':
            from make_reservation import run
            run(args)

        elif args.command == 'list':
            from view_bookings import run
            run(args)

        elif args.command == 'cancel':
            from cancel_booking import run
            run(args)

        elif args.command == 'log':
            from check_retry_log import tail_log
            from pathlib import Path
            log_file = Path.home() / '.openclaw' / 'tmp' / 'srt' / 'reserve.log'
            tail_log(log_file, args.lines)

    except KeyboardInterrupt:
        print("\n\n⚠️  사용자에 의해 중단되었습니다.")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ 오류: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
