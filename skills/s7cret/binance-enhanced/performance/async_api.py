"""
Async API client helpers
- Parallel requests using asyncio.gather with semaphore for concurrency
- Command queue to respect rate limits (token bucket)
- Retry logic with exponential backoff
"""
from __future__ import annotations
import asyncio
import time
import random
from typing import Any, Callable, Coroutine, Optional, List

try:
    import aiohttp
except Exception:
    aiohttp = None  # type: ignore

try:
    import orjson as _json
except Exception:
    import json as _json


class RateLimiter:
    """Simple token-bucket rate limiter."""

    def __init__(self, rate: float, per: float = 1.0):
        self._capacity = rate
        self._tokens = rate
        self._per = per
        self._last = time.time()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: float = 1.0):
        async with self._lock:
            now = time.time()
            # refill
            elapsed = now - self._last
            refill = elapsed * (self._capacity / self._per)
            if refill > 0:
                self._tokens = min(self._capacity, self._tokens + refill)
                self._last = now
            if tokens <= self._tokens:
                self._tokens -= tokens
                return
            # wait until enough tokens
            need = tokens - self._tokens
            wait_time = need * (self._per / self._capacity)
        await asyncio.sleep(wait_time)
        # recursive try
        await self.acquire(tokens)


class AsyncAPIClient:
    def __init__(self, base_url: str = "https://api.binance.com", concurrency: int = 10, rate: float = 20.0, per: float = 1.0):
        if aiohttp is None:
            raise RuntimeError("aiohttp is required for AsyncAPIClient")
        self.base_url = base_url.rstrip('/')
        self._session: Optional[aiohttp.ClientSession] = None
        self._sem = asyncio.Semaphore(concurrency)
        self._rate_limiter = RateLimiter(rate=rate, per=per)

    async def _ensure_session(self):
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()

    async def close(self):
        if self._session:
            await self._session.close()

    async def _request(self, method: str, path: str, params: dict | None = None, json_body: Any = None, headers: dict | None = None, retries: int = 3) -> Any:
        await self._ensure_session()
        url = f"{self.base_url}/{path.lstrip('/')}"
        backoff = 0.2
        for attempt in range(retries + 1):
            await self._rate_limiter.acquire()
            async with self._sem:
                try:
                    async with self._session.request(method, url, params=params, json=json_body, headers=headers, timeout=10) as resp:
                        text = await resp.text()
                        if resp.status >= 500:
                            raise RuntimeError(f"server error: {resp.status}")
                        if resp.status >= 400:
                            # return the body for client errors
                            return _json.loads(text)
                        # success
                        try:
                            return _json.loads(text)
                        except Exception:
                            return text
                except asyncio.CancelledError:
                    raise
                except Exception as e:
                    if attempt == retries:
                        raise
                    # jittered backoff
                    await asyncio.sleep(backoff + random.random() * backoff)
                    backoff *= 2
        raise RuntimeError("unreachable")

    async def get(self, path: str, params: dict | None = None, **kwargs) -> Any:
        return await self._request('GET', path, params=params, **kwargs)

    async def post(self, path: str, json_body: Any = None, **kwargs) -> Any:
        return await self._request('POST', path, json_body=json_body, **kwargs)

    async def parallel_get(self, paths: List[str], params_list: Optional[List[dict]] = None, concurrency: int = 20) -> List[Any]:
        params_list = params_list or [None] * len(paths)
        sem = asyncio.Semaphore(concurrency)

        async def worker(pth, p):
            async with sem:
                return await self.get(pth, params=p)

        tasks = [asyncio.create_task(worker(p, q)) for p, q in zip(paths, params_list)]
        return await asyncio.gather(*tasks)


if __name__ == "__main__":
    import asyncio

    async def demo():
        client = AsyncAPIClient(concurrency=5, rate=10, per=1)
        try:
            res = await client.parallel_get(["/api/v3/time"] * 5)
            print(res)
        finally:
            await client.close()

    asyncio.run(demo())
