import sys
import os
import argparse
# Add local lib to path to use patched korail2
sys.path.append(os.path.join(os.path.dirname(__file__), '../lib'))
from korail2 import Korail

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dep", required=True)
    parser.add_argument("--arr", required=True)
    parser.add_argument("--date", default=None)
    parser.add_argument("--time", default=None)
    args = parser.parse_args()

    # Load Creds (TODO: better secure loading)
    # For now, hardcoding for demo or loading from known path
    KORAIL_ID = os.environ.get("KORAIL_ID", "0650620216")
    KORAIL_PW = os.environ.get("KORAIL_PW", "fly*2015")

    try:
        korail = Korail(KORAIL_ID, KORAIL_PW)
        trains = korail.search_train(args.dep, args.arr, args.date, args.time)
        for t in trains:
            print(t)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
