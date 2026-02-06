Examples of using the UX helpers

1. Quick parse

$ python3 parser.py "купи 0.1 BTC по рынку"
{'raw_text': 'купи 0.1 BTC по рынку', 'side': 'BUY', 'quantity': 0.1, 'order_type': 'MARKET', 'price': None, 'symbol': 'BTCUSDT', 'base_asset': 'BTC', 'quote_asset': 'USDT'}

2. Interactive dialog (python REPL)

from interactive import DialogManager
import parser

dm = DialogManager(parser)
state = dm.start('купить 0.5 ETH')
print(dm.next_prompt(state)) # asks for quote currency or order type

3. Telegram flow

User: "купи 0.1 BTC по рынку"
Bot: shows confirmation message with inline buttons: [Подтвердить] [Редактировать] [Отменить]

Design decisions

- Parser supports RU/EN keywords and common formats (BTCUSDT, BTC/USDT, BTC USDT)
- Dialog manager fills missing fields using parser + autocomplete
- Confirmation always shows before any execution

Next steps

- Integrate with real exchange metadata for symbol validation and lot-size checks
- Wire the prototype into python-telegram-bot or aiogram with proper callback handling
- Add unit tests for the parser and dialog flows
