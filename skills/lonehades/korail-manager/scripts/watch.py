import sys
import os
import argparse
import time
import requests
from datetime import datetime, timedelta

# Add local lib to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../lib'))
from korail2 import Korail, SoldOutError

def send_telegram_alert(token, chat_id, message):
    if not token or not chat_id:
        print(f"⚠️ 텔레그램 설정 누락으로 알림 발송 실패: {message}")
        return
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {"chat_id": chat_id, "text": message}
        requests.post(url, json=payload, timeout=10)
    except Exception as e:
        print(f"⚠️ 텔레그램 발송 실패: {e}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dep", required=True)
    parser.add_argument("--arr", required=True)
    parser.add_argument("--date", required=True)
    parser.add_argument("--start-time", type=int, required=True)
    parser.add_argument("--end-time", type=int, required=True)
    parser.add_argument("--interval", type=int, default=300)
    args = parser.parse_args()

    # Credentials & Config
    KORAIL_ID = os.environ.get("KORAIL_ID", "0650620216")
    KORAIL_PW = os.environ.get("KORAIL_PW", "fly*2015")
    TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8395240435:AAHKORT3i8CCNYKoDrO73yUv2J4HvWZi-3k")
    TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "64425314")

    print(f"🚀 감시 시작: {args.date} {args.dep}->{args.arr} ({args.start_time}~{args.end_time}시)")

    korail = None
    
    while True:
        try:
            if not korail:
                korail = Korail(KORAIL_ID, KORAIL_PW)
                print("✅ 로그인 성공")

            search_time = f"{args.start_time:02d}0000"
            trains = korail.search_train(args.dep, args.arr, args.date, search_time)
            
            target_train = None
            for t in trains:
                if "KTX" not in t.train_type_name: continue
                
                dep_hour = int(t.dep_time[:2])
                if not (args.start_time <= dep_hour < args.end_time): continue
                
                # Strict station check
                if t.dep_name != args.dep or t.arr_name != args.arr: continue

                if t.has_general_seat():
                    target_train = t
                    break
            
            if target_train:
                print(f"🎯 발견: {target_train}")
                try:
                    korail.reserve(target_train)
                    msg = f"🎉 [예매 성공!]\n{target_train}\n\n🚨 즉시 결제 요망!"
                    print(msg)
                    send_telegram_alert(TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, msg)
                    break
                except SoldOutError:
                    print("⚠️ 매진됨")
                except Exception as e:
                    print(f"❌ 예매 오류: {e}")
                    send_telegram_alert(TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, f"❌ 오류: {e}")
            else:
                print(f".", end="", flush=True)

        except Exception as e:
            print(f"⚠️ 오류(재시도): {e}")
            korail = None # Force re-login
            time.sleep(10)

        time.sleep(args.interval)

if __name__ == "__main__":
    main()
