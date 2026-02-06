#!/usr/bin/env python3
"""
Dialog manager for trading commands.
Walks a user through missing fields, validates basic rules and constructs a confirmation message.
"""
from typing import Dict, Optional
from templates import render_confirmation, friendly_error
from autocomplete import suggest_symbols

REQUIRED_FIELDS = ['side', 'quantity', 'base_asset', 'quote_asset', 'order_type']


class DialogManager:
    def __init__(self, parser):
        self.parser = parser

    def start(self, text: str) -> Dict:
        parsed = self.parser.parse(text)
        state = {**parsed}
        return state

    def next_prompt(self, state: Dict) -> Optional[str]:
        # find first missing required field
        for f in REQUIRED_FIELDS:
            if not state.get(f):
                if f == 'base_asset' and state.get('symbol'):
                    continue
                return self.prompt_for(f, state)
        return None

    def prompt_for(self, field: str, state: Dict) -> str:
        if field == 'side':
            return 'Вы хотите купить или продать? (купи / продай)'
        if field == 'quantity':
            return 'Сколько единиц вы хотите купить/продать? (например: 0.1)'
        if field == 'base_asset':
            return 'Какой актив вы хотите торговать? (например: BTC или BTC/USDT)'
        if field == 'quote_asset':
            return 'В какой валюте расчетов? (например: USDT)' 
        if field == 'order_type':
            return 'Тип ордера? (market / limit)'
        return 'Уточните, пожалуйста.'

    def handle_user_reply(self, state: Dict, reply: str) -> Dict:
        # naive handling: try parsing reply for relevant parts
        p = self.parser.parse(reply)
        for k in ['side', 'quantity', 'order_type', 'symbol', 'base_asset', 'quote_asset', 'price']:
            if p.get(k):
                state[k] = p[k]
        # try autocomplete for symbol candidates
        if not state.get('symbol') and state.get('base_asset') and state.get('quote_asset'):
            state['symbol'] = f"{state['base_asset']}{state['quote_asset']}"
        elif not state.get('quote_asset') and state.get('base_asset'):
            # suggest quotes
            suggestions = suggest_symbols(state['base_asset'])
            if suggestions:
                state['quote_asset'] = suggestions[0]['quote']
                state['symbol'] = suggestions[0]['symbol']
        return state

    def validate(self, state: Dict) -> Optional[str]:
        # basic validations
        if state.get('quantity') is None:
            return friendly_error('quantity_missing')
        if state.get('quantity') <= 0:
            return friendly_error('quantity_invalid')
        if not state.get('symbol'):
            return friendly_error('symbol_missing')
        if state.get('order_type') == 'LIMIT' and state.get('price') is None:
            return friendly_error('price_missing')
        return None

    def confirmation_message(self, state: Dict) -> str:
        return render_confirmation(state)


if __name__ == '__main__':
    import parser as pmod
    dm = DialogManager(pmod)
    text = input('Command: ')
    state = dm.start(text)
    while True:
        err = dm.validate(state)
        if err:
            print('Error:', err)
            pr = dm.next_prompt(state)
            if not pr:
                print('Cannot continue')
                break
            print(pr)
            r = input('> ')
            state = dm.handle_user_reply(state, r)
            continue
        print('\nConfirmation:')
        print(dm.confirmation_message(state))
        break
