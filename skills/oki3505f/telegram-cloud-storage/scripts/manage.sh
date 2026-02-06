#!/bin/bash
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$SKILL_DIR/bin/teldrive"
CONFIG="$SKILL_DIR/config/config.toml"
PID_FILE="$SKILL_DIR/teldrive.pid"
LOG_DIR="$SKILL_DIR/logs"

mkdir -p "$LOG_DIR"

case "$1" in
    start)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "Teldrive is already running (PID $(cat "$PID_FILE"))."
            exit 0
        fi
        
        if [ ! -f "$CONFIG" ]; then
            echo "Config file not found at $CONFIG. Run setup.sh first."
            exit 1
        fi

        echo "Starting Teldrive..."
        nohup "$BIN" run --config "$CONFIG" > "$LOG_DIR/stdout.log" 2>&1 &
        echo $! > "$PID_FILE"
        echo "Started. PID: $(cat "$PID_FILE")"
        echo "Logs: $LOG_DIR/stdout.log"
        ;;
    stop)
        if [ ! -f "$PID_FILE" ]; then
            echo "Pidfile not found. Is Teldrive running?"
            exit 1
        fi
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Stopping Teldrive (PID $PID)..."
            kill "$PID"
            rm "$PID_FILE"
            echo "Stopped."
        else
            echo "Process $PID not found. Cleaning up pidfile."
            rm "$PID_FILE"
        fi
        ;;
    status)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "Teldrive is running (PID $(cat "$PID_FILE"))."
        else
            echo "Teldrive is NOT running."
        fi
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
