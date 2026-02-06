#!/bin/bash
# XHS-Downloader API 服务启动脚本

XHS_DIR="/Users/lixiaoji/Downloads/XHS-Downloader-master-2"
VENV_DIR="$XHS_DIR/venv"
PID_FILE="/tmp/xhs-downloader-api.pid"
LOG_FILE="/tmp/xhs-downloader-api.log"

start() {
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo "XHS-Downloader API 已在运行 (PID: $(cat $PID_FILE))"
        return 0
    fi
    
    echo "启动 XHS-Downloader API 服务..."
    
    # 检查虚拟环境
    if [ ! -d "$VENV_DIR" ]; then
        echo "创建虚拟环境..."
        cd "$XHS_DIR"
        python3 -m venv venv
        source "$VENV_DIR/bin/activate"
        pip install -r requirements.txt -q
    fi
    
    # 启动服务
    cd "$XHS_DIR"
    source "$VENV_DIR/bin/activate"
    nohup python main.py api > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    sleep 2
    
    if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo "✓ XHS-Downloader API 已启动 (PID: $(cat $PID_FILE))"
        echo "  API 地址: http://127.0.0.1:5556"
        echo "  文档地址: http://127.0.0.1:5556/docs"
    else
        echo "✗ 启动失败，查看日志: $LOG_FILE"
        return 1
    fi
}

stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            echo "停止 XHS-Downloader API (PID: $PID)..."
            kill $PID
            rm -f "$PID_FILE"
            echo "✓ 已停止"
        else
            echo "进程不存在，清理 PID 文件"
            rm -f "$PID_FILE"
        fi
    else
        echo "XHS-Downloader API 未运行"
    fi
}

status() {
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo "✓ XHS-Downloader API 运行中 (PID: $(cat $PID_FILE))"
        # 检查端口
        if curl -s http://127.0.0.1:5556/docs > /dev/null 2>&1; then
            echo "  API 可访问: http://127.0.0.1:5556"
        fi
    else
        echo "✗ XHS-Downloader API 未运行"
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 1
        start
        ;;
    status)
        status
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
