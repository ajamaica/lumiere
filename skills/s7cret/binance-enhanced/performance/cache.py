"""
Cache utilities for Binance skill
- Price cache with TTL (5-10s configurable)
- Balances cache (longer TTL)
- Invalidation helpers

Simple in-memory thread-safe caches using asyncio locks.
"""
from __future__ import annotations
import time
import asyncio
from typing import Any, Dict, Optional

try:
    import orjson as _json
except Exception:
    import json as _json


class TTLCache:
    def __init__(self, ttl: float = 5.0):
        self._ttl = ttl
        self._store: Dict[str, Any] = {}
        self._exp: Dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key in self._store:
                if time.time() < self._exp.get(key, 0):
                    return self._store[key]
                else:
                    # expired
                    del self._store[key]
                    del self._exp[key]
            return None

    async def set(self, key: str, value: Any):
        async with self._lock:
            self._store[key] = value
            self._exp[key] = time.time() + self._ttl

    async def invalidate(self, key: str):
        async with self._lock:
            if key in self._store:
                del self._store[key]
            if key in self._exp:
                del self._exp[key]

    async def clear(self):
        async with self._lock:
            self._store.clear()
            self._exp.clear()


class BalancesCache:
    def __init__(self):
        self._store: Dict[str, Any] = {}
        self._lock = asyncio.Lock()

    async def get(self, account_id: str) -> Optional[Any]:
        async with self._lock:
            return self._store.get(account_id)

    async def set(self, account_id: str, balances: Any):
        async with self._lock:
            self._store[account_id] = {
                "balances": balances,
                "last_update": time.time(),
            }

    async def invalidate(self, account_id: str):
        async with self._lock:
            if account_id in self._store:
                del self._store[account_id]

    async def clear(self):
        async with self._lock:
            self._store.clear()


# Singleton instances for easy import/use
price_cache = TTLCache(ttl=7.0)  # default to 7s
balances_cache = BalancesCache()


async def invalidate_on_balance_change(account_id: str):
    # call this when you detect a balance-changing event
    await balances_cache.invalidate(account_id)


if __name__ == "__main__":
    import asyncio

    async def demo():
        await price_cache.set('BTCUSDT', {'price': '50000'})
        print(await price_cache.get('BTCUSDT'))
        await asyncio.sleep(8)
        print(await price_cache.get('BTCUSDT'))

    asyncio.run(demo())
