#!/usr/bin/env python3
"""
User-friendly message templates for confirmations and errors.
"""

ERRORS = {
    'quantity_missing': 'Количество не указано. Пожалуйста, введите количество (например: 0.1).',
    'quantity_invalid': 'Некорректное количество. Должно быть положительным числом.',
    'symbol_missing': 'Не указан торговый символ. Укажите, например, BTC/USDT.',
    'price_missing': 'Для лимитного ордера необходима цена. Укажите цену (например: 40000).'
}


def friendly_error(code: str) -> str:
    return ERRORS.get(code, 'Неизвестная ошибка. Пожалуйста, повторите.')


def render_confirmation(state: dict) -> str:
    side = state.get('side', '—')
    qty = state.get('quantity', '—')
    sym = state.get('symbol') or (state.get('base_asset') and state.get('quote_asset') and f"{state['base_asset']}{state['quote_asset']}") or '—'
    otype = state.get('order_type', '—')
    price = state.get('price')

    lines = [f"Ордeр для подтверждения:", f"{side} {qty} {sym} ({otype})"]
    if otype == 'LIMIT' and price:
        lines.append(f"Цена: {price}")
    lines.append('\nПожалуйста, подтвердите операцию:')
    lines.append('[Подтвердить]  [Редактировать]  [Отменить]')
    return '\n'.join(lines)
