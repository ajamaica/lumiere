#!/usr/bin/env python3
"""
Make reservation tool for SRT skill.
Reserves trains with automatic retry support.
"""

import sys
import argparse
import time
import json
from datetime import datetime
from pathlib import Path
from utils import (
    load_credentials,
    handle_error,
    output_json,
    format_reservation_info,
    load_search_results,
    RateLimiter
)


class RetryLogger:
    """Log retry progress to file and stdout"""
    
    def __init__(self, log_file=None):
        if log_file is None:
            log_dir = Path.home() / '.openclaw' / 'tmp' / 'srt'
            log_dir.mkdir(parents=True, exist_ok=True)
            log_file = log_dir / 'reserve.log'
        self.log_file = Path(log_file)
        
    def log(self, message, level="INFO"):
        """Log message to file and stdout"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {level}: {message}"
        
        # Write to file
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry + "\n")
        
        # Print to stdout
        print(log_entry, flush=True)
    
    def log_json(self, data):
        """Log JSON data"""
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        self.log(f"JSON OUTPUT:\n{json_str}")


def attempt_reservation(credentials, train, logger=None):
    """
    Attempt to reserve a specific train.
    
    Args:
        credentials: dict with phone and password
        train: SRT train object
        logger: Optional RetryLogger instance
        
    Returns:
        reservation object if successful, None if failed
    """
    from SRT import SRT
    
    try:
        msg = f"🎫 예약 시도 중... (열차 {train.train_number}, {train.dep_time})"
        if logger:
            logger.log(msg, "INFO")
        else:
            print(msg)
        
        srt = SRT(credentials['phone'], credentials['password'])
        reservation = srt.reserve(train)
        return reservation
    except Exception as e:
        error_msg = str(e)
        if "잔여석없음" in error_msg or "매진" in error_msg:
            msg = f"❌ 좌석 없음 (열차 {train.train_number})"
            if logger:
                logger.log(msg, "WARN")
            else:
                print(msg)
        else:
            msg = f"❌ 예약 실패: {error_msg}"
            if logger:
                logger.log(msg, "ERROR")
            else:
                print(msg)
        return None


def display_success(reservation, logger=None, attempts=1):
    """Display reservation success"""
    msgs = [
        "✅ 예약 성공!",
        f"예약번호: {getattr(reservation, 'reservation_number', 'N/A')}",
        f"열차번호: {getattr(reservation, 'train_number', 'N/A')}",
        f"좌석: {getattr(reservation, 'seat_number', 'N/A')}",
        "⚠️  결제는 SRT 앱 또는 웹사이트에서 완료해주세요!"
    ]
    
    if logger:
        for msg in msgs:
            logger.log(msg, "SUCCESS")
    else:
        print("\n" + "\n".join(msgs) + "\n")
    
    # Output JSON
    info = format_reservation_info(reservation)
    info['success'] = True
    info['payment_required'] = True
    info['attempts'] = attempts
    
    if logger:
        logger.log_json(info)
    else:
        output_json(info, success=True)


def make_reservation_with_retry(credentials, args):
    """
    Make a reservation with optional retry logic.
    
    Args:
        credentials: dict with phone and password
        args: argparse namespace with reservation parameters
        
    Returns:
        0 on success, 1 on retryable failure, 2 on fatal error
    """
    # Load search results
    all_trains = load_search_results()
    if not all_trains:
        print("❌ 검색 결과를 찾을 수 없습니다. 먼저 'search' 명령으로 열차를 검색해주세요.", file=sys.stderr)
        return 2
    
    # Filter trains by train-id if specified
    if args.train_id:
        train_ids = [int(tid.strip()) for tid in args.train_id.split(',')]
        trains = []
        for tid in train_ids:
            train_idx = tid - 1
            if train_idx < 0 or train_idx >= len(all_trains):
                print(f"❌ 잘못된 열차 번호: {tid} (1부터 {len(all_trains)} 사이여야 함)", file=sys.stderr)
                return 2
            trains.append(all_trains[train_idx])
    else:
        trains = all_trains
    
    # Setup
    limiter = RateLimiter()
    logger = RetryLogger() if args.retry else None
    
    if args.retry:
        logger.log("=== SRT 예약 시작 (재시도 모드) ===", "INFO")
        logger.log(f"타임아웃: {args.timeout_minutes}분", "INFO")
        logger.log(f"재시도 간격: {args.wait_seconds}초", "INFO")
        if args.train_id:
            logger.log(f"대상 열차: {args.train_id} (총 {len(trains)}개)", "INFO")
        else:
            logger.log(f"대상 열차: 전체 (총 {len(trains)}개)", "INFO")
    
    # Calculate timeout
    start_time = time.time()
    timeout_seconds = args.timeout_minutes * 60 if args.retry else 0
    
    attempt = 0
    train_index = 0
    
    while True:
        attempt += 1
        
        # Check timeout
        if args.retry and timeout_seconds > 0:
            elapsed = time.time() - start_time
            if elapsed >= timeout_seconds:
                msg = f"⏰ 타임아웃 ({args.timeout_minutes}분 경과)"
                if logger:
                    logger.log(msg, "ERROR")
                    logger.log(f"\n===== 최종결과: TIMEOUT (총 {attempt-1}회 시도) =====", "ERROR")
                    logger.log_json({
                        "success": False,
                        "error": "Timeout",
                        "message": f"{args.timeout_minutes}분 타임아웃",
                        "attempts": attempt - 1
                    })
                else:
                    print(msg, file=sys.stderr)
                return 1
        
        # Select train (cycle through all trains)
        if train_index >= len(trains):
            if logger:
                logger.log("모든 열차 시도 완료. 처음부터 다시 시작합니다.", "INFO")
            train_index = 0
        
        train = trains[train_index]
        
        if logger:
            logger.log(f"\n=== 시도 #{attempt} (열차 {train_index + 1}/{len(trains)}) ===", "INFO")
            logger.log(f"열차: {train.train_number} ({train.dep_time} → {train.arr_time})", "INFO")
        
        # Rate limiting
        can_reserve, wait_time = limiter.check_reserve_rate()
        if not can_reserve:
            msg = f"⏳ Rate limit 대기 중... ({int(wait_time)}초)"
            if logger:
                logger.log(msg, "INFO")
            else:
                print(msg)
            time.sleep(wait_time)
        
        # Attempt reservation
        reservation = attempt_reservation(credentials, train, logger)
        limiter.record_reserve()
        
        if reservation:
            # Success!
            display_success(reservation, logger, attempt)
            if logger:
                logger.log(f"\n===== 최종결과: SUCCESS (총 {attempt}회 시도) =====", "SUCCESS")
            return 0
        
        # Move to next train
        train_index += 1
        
        # If not in retry mode, fail immediately
        if not args.retry:
            error_info = handle_error(Exception("좌석 없음"), context="reserve")
            output_json(error_info, success=False)
            return 1
        
        # Wait before next attempt
        if logger:
            logger.log(f"⏳ {args.wait_seconds}초 대기 후 재시도...", "INFO")
        time.sleep(args.wait_seconds)


def run(args):
    """Run reservation with pre-parsed args from srt_cli.py."""
    try:
        credentials = load_credentials()
        exit_code = make_reservation_with_retry(credentials, args)
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⚠️  사용자에 의해 중단되었습니다.")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ 예상치 못한 오류: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(2)


def main():
    parser = argparse.ArgumentParser(description="SRT 열차 예약")
    parser.add_argument('--train-id', 
                        help="열차 번호 (검색 결과의 순번, 쉼표로 복수 지정 가능, 생략 시 모든 열차 시도)\n"
                             "예: --train-id 1 또는 --train-id 1,3,5")
    parser.add_argument('--retry', action='store_true', 
                        help='실패 시 자동 재시도 (백그라운드 실행 권장)')
    parser.add_argument('--timeout-minutes', type=int, default=60,
                        help='최대 시도 시간 (분, 기본값: 60)')
    parser.add_argument('--wait-seconds', type=int, default=10,
                        help='재시도 대기 시간 (초, 기본값: 10)')
    
    args = parser.parse_args()
    
    run(args)


if __name__ == "__main__":
    main()
