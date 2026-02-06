# openclaw-finnhub/scripts/app.py
# coding: utf-8

import finnhub
import os
import sys

finnhub_api_key = os.getenv('finnhub_api_key')
client = finnhub.Client(api_key=finnhub_api_key)

def get_quote(stock):
    quote = client.quote(stock)

    return f'Current price: ${quote["c"]}, Change: ${quote["d"]}({quote["dp"]}%), Highest price: ${quote["h"]}, Lower price: ${quote["l"]}'

if __name__ == "__main__":
    if sys.argv[1]:
        print(get_quote([sys.argv[2]]))
