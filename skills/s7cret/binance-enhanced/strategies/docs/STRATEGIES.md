Документация по стратегиям

1. DCA (Dollar-Cost Averaging)

- Описание: регулярные покупки фиксированной суммы в выбранную пару
- Файл: dca.py
- Параметры: amount_per_interval, interval
- Backtest: backtest/example_backtest.py

2. Grid trading

- Описание: размещение лимитных ордеров на сетке между lower и upper
- Файл: grid.py
- Параметры: lower_price, upper_price, grid_size, investment

3. Arbitrage

- Описание: поиск триангулярных возможностей между парами
- Файл: arbitrage.py
- Параметры: pair symbols, fee

Indicators:

- RSI, MACD, Bollinger: indicators/ta.py
- TradingView templates: indicators/tradingview_templates/

Backtesting:

- Простой фреймворк: backtest/framework.py
- Пример: backtest/example_backtest.py

Как использовать:

- Подготовьте CSV с timestamp,indexed and a close column
- Импортируйте стратегию, создайте объект и запустите bt.run_strategy

Примечание: это базовые реализации — используйте их как стартовую точку и расширяйте под реальные API и risk management.
