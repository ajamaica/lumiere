#!/usr/bin/env python3
"""
Shared utilities for SRT skill.
Handles configuration, error formatting, rate limiting, and output formatting.
"""

import os
import json
import time
import sys
from pathlib import Path
from datetime import datetime


class RateLimiter:
    """Track and enforce rate limits for SRT API calls"""

    def __init__(self, state_file=None):
        if state_file is None:
            state_file = Path.home() / '.openclaw' / 'tmp' / 'srt' / 'rate_limit.json'
        self.state_file = Path(state_file)
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        self.load_state()

    def load_state(self):
        """Load rate limit state from file"""
        if self.state_file.exists():
            try:
                with open(self.state_file, 'r') as f:
                    self.state = json.load(f)
            except (json.JSONDecodeError, IOError):
                self.state = self._default_state()
        else:
            self.state = self._default_state()

    def _default_state(self):
        """Return default state structure"""
        return {
            'last_search': 0,
            'last_reserve': 0,
            'attempt_count': 0,
            'session_start': time.time()
        }

    def save_state(self):
        """Save rate limit state to file"""
        try:
            with open(self.state_file, 'w') as f:
                json.dump(self.state, f)
        except IOError as e:
            print(f"⚠️  Warning: Could not save rate limit state: {e}", file=sys.stderr)

    def check_search_rate(self):
        """Check if enough time has passed since last search (5 seconds)"""
        elapsed = time.time() - self.state.get('last_search', 0)
        if elapsed < 5:
            return False, 5 - elapsed
        return True, 0

    def check_reserve_rate(self):
        """Check if enough time has passed since last reservation (3 seconds)"""
        elapsed = time.time() - self.state.get('last_reserve', 0)
        if elapsed < 3:
            return False, 3 - elapsed
        return True, 0

    def record_search(self):
        """Record a search operation"""
        self.state['last_search'] = time.time()
        self.save_state()

    def record_reserve(self):
        """Record a reservation attempt"""
        self.state['last_reserve'] = time.time()
        self.state['attempt_count'] = self.state.get('attempt_count', 0) + 1
        self.save_state()

    def get_attempt_count(self):
        """Get number of attempts in current session"""
        return self.state.get('attempt_count', 0)

    def reset_session(self):
        """Reset attempt counter for new session"""
        self.state['attempt_count'] = 0
        self.state['session_start'] = time.time()
        self.save_state()

    def calculate_backoff(self, attempt):
        """Calculate exponential backoff delay"""
        delays = [3, 5, 10, 15, 20]
        if attempt < len(delays):
            return delays[attempt]
        return 30  # Maximum 30 second delay


def wait_with_message(seconds, message="대기 중..."):
    """Wait with progress message"""
    print(f"⏳ {message} ({int(seconds)}초)", flush=True)
    time.sleep(seconds)


def check_attempt_limit(limiter, max_attempts=10):
    """Check if retry limit exceeded"""
    attempts = limiter.get_attempt_count()
    if attempts >= max_attempts:
        raise Exception(
            f"재시도 한도 초과: {max_attempts}회 시도 후 실패했습니다. "
            f"SRT 계정 보호를 위해 잠시 후 다시 시도해주세요."
        )
    return attempts


def load_credentials():
    """
    Load SRT credentials from environment variables.

    Required environment variables:
        SRT_PHONE: SRT account phone number (e.g., 010-1234-5678)
        SRT_PASSWORD: SRT account password

    Returns:
        dict: {'phone': str, 'password': str}

    Raises:
        Exception: If credentials are not set
    """
    phone = os.environ.get('SRT_PHONE')
    password = os.environ.get('SRT_PASSWORD')

    if not phone or not password:
        missing = []
        if not phone:
            missing.append('SRT_PHONE')
        if not password:
            missing.append('SRT_PASSWORD')
        raise Exception(
            f"SRT 인증 정보를 찾을 수 없습니다.\n"
            f"다음 환경 변수를 설정해주세요: {', '.join(missing)}\n"
            f"예:\n"
            f"  export SRT_PHONE=\"010-1234-5678\"\n"
            f"  export SRT_PASSWORD=\"your_password\""
        )

    return {'phone': phone, 'password': password}


def handle_error(error, context=""):
    """
    Format errors with user-friendly messages and resolution steps.

    Args:
        error: Exception object or error message
        context: Additional context about where error occurred

    Returns:
        dict: Error information for JSON output
    """
    error_msg = str(error)
    error_type = "UnknownError"
    suggestion = ""

    # Authentication errors
    if "login" in error_msg.lower() or "auth" in error_msg.lower() or "회원" in error_msg or "인증" in error_msg:
        error_type = "AuthenticationFailed"
        suggestion = "인증 정보를 확인해주세요 (전화번호와 비밀번호)"

    # Network errors
    elif "network" in error_msg.lower() or "connection" in error_msg.lower() or "timeout" in error_msg.lower():
        error_type = "NetworkError"
        suggestion = "네트워크 연결을 확인하고 다시 시도해주세요"

    # No seats available
    elif "seat" in error_msg.lower() or "매진" in error_msg.lower():
        error_type = "NoSeatsAvailable"
        suggestion = "다른 열차나 시간대를 시도해보세요"

    # Station errors
    elif "station" in error_msg.lower() or "역" in error_msg.lower():
        error_type = "StationNotFound"
        suggestion = "역 이름을 한글로 정확히 입력해주세요 (예: 수서, 부산, 동대구)"

    # No trains found
    elif "no train" in error_msg.lower() or "열차" in error_msg.lower():
        error_type = "NoTrainsFound"
        suggestion = "다른 날짜나 시간대를 시도해보세요"

    # Reservation errors
    elif "reserv" in error_msg.lower() or "예약" in error_msg.lower():
        error_type = "ReservationFailed"
        suggestion = "예약에 실패했습니다. 잠시 후 다시 시도해주세요"

    # Cancellation errors
    elif "cancel" in error_msg.lower() or "취소" in error_msg.lower():
        error_type = "CancellationFailed"
        suggestion = "취소할 수 없습니다 (이미 취소되었거나 결제 완료됨)"

    # Rate limit errors
    elif "재시도 한도" in error_msg or "attempt" in error_msg.lower():
        error_type = "RateLimitExceeded"
        suggestion = "잠시 후 다시 시도해주세요"

    full_message = f"{error_msg}"
    if suggestion:
        full_message += f"\n💡 {suggestion}"
    if context:
        full_message = f"[{context}] {full_message}"

    print(f"❌ {full_message}", file=sys.stderr)

    return {
        "error": error_type,
        "message": error_msg,
        "suggestion": suggestion,
        "context": context
    }


def output_json(data, success=True):
    """
    Output structured JSON for AI parsing.

    Args:
        data: Data to output (dict, list, etc.)
        success: Whether operation was successful
    """
    print("\n--- JSON OUTPUT ---")
    result = {"success": success}
    if success:
        result["data"] = data
    else:
        result["error"] = data.get("error", "UnknownError")
        result["message"] = data.get("message", str(data))
        if "suggestion" in data:
            result["suggestion"] = data["suggestion"]
    print(json.dumps(result, ensure_ascii=False, indent=2))


def format_train_info(train):
    """
    Format SRTrain train object for display.

    Args:
        train: SRT train object

    Returns:
        dict: Formatted train information
    """
    general_seat = train.general_seat_state if hasattr(train, 'general_seat_state') else 'N/A'
    special_seat = train.special_seat_state if hasattr(train, 'special_seat_state') else 'N/A'
    seat_available = general_seat == '예약가능' or special_seat == '예약가능'

    return {
        "train_number": train.train_number,
        "train_name": train.train_name if hasattr(train, 'train_name') else f"SRT{train.train_number}",
        "departure_time": train.dep_time,
        "arrival_time": train.arr_time,
        "departure_station": train.dep_station_name,
        "arrival_station": train.arr_station_name,
        "seat_available": seat_available,
        "general_seat": general_seat,
        "special_seat": special_seat
    }


def format_reservation_info(reservation):
    """
    Format SRTrain reservation object for display.

    Args:
        reservation: SRT reservation object

    Returns:
        dict: Formatted reservation information
    """
    return {
        "reservation_id": getattr(reservation, 'reservation_number', 'N/A'),
        "journey_date": getattr(reservation, 'journey_date', 'N/A'),
        "journey_time": getattr(reservation, 'journey_time', 'N/A'),
        "departure": getattr(reservation, 'dep_station_name', 'N/A'),
        "arrival": getattr(reservation, 'arr_station_name', 'N/A'),
        "train_number": getattr(reservation, 'train_number', 'N/A'),
        "seat_number": getattr(reservation, 'seat_number', 'N/A'),
        "payment_required": getattr(reservation, 'payment_required', True)
    }


def print_table(headers, rows):
    """
    Print data in table format.

    Args:
        headers: List of column headers
        rows: List of row data (list of lists)
    """
    if not rows:
        print("데이터가 없습니다.")
        return

    # Calculate column widths
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            col_widths[i] = max(col_widths[i], len(str(cell)))

    # Print header
    header_row = " | ".join(h.ljust(w) for h, w in zip(headers, col_widths))
    print(header_row)
    print("-" * len(header_row))

    # Print rows
    for row in rows:
        print(" | ".join(str(cell).ljust(w) for cell, w in zip(row, col_widths)))


def save_search_results(trains):
    """
    Save search results to temporary file for later reservation.

    Args:
        trains: List of train objects
    """
    import pickle
    cache_dir = Path.home() / '.openclaw' / 'tmp' / 'srt'
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / 'last_search.pkl'

    try:
        with open(cache_file, 'wb') as f:
            pickle.dump(trains, f)
    except Exception as e:
        print(f"⚠️  Warning: Could not save search results: {e}", file=sys.stderr)


def load_search_results():
    """
    Load previously saved search results.

    Returns:
        list: List of train objects, or None if not found
    """
    import pickle
    cache_file = Path.home() / '.openclaw' / 'tmp' / 'srt' / 'last_search.pkl'

    if not cache_file.exists():
        return None

    try:
        with open(cache_file, 'rb') as f:
            return pickle.load(f)
    except Exception as e:
        print(f"⚠️  Warning: Could not load search results: {e}", file=sys.stderr)
        return None
