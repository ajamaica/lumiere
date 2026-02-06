"""
Cache helper for jq scripts
- Reads jq filter file and caches compiled representation (if using python-jq) or raw text
- Speeds up repeated jq usage by avoiding file I/O
"""
from __future__ import annotations
import time
import asyncio
from typing import Dict, Optional

try:
    import jq as _jq
except Exception:
    _jq = None  # fallback; we'll cache text


class JQCache:
    def __init__(self):
        self._cache: Dict[str, Dict] = {}
        self._lock = asyncio.Lock()

    async def load(self, path: str) -> str:
        """Return compiled jq program or raw text."""
        async with self._lock:
            if path in self._cache:
                return self._cache[path]['prog']
            with open(path, 'r', encoding='utf-8') as f:
                txt = f.read()
            if _jq is not None:
                prog = _jq.compile(txt)
            else:
                prog = txt
            self._cache[path] = {'prog': prog, 'loaded': time.time()}
            return prog


jq_cache = JQCache()

if __name__ == "__main__":
    import asyncio

    async def demo():
        # create a temp jq file
        p = '/tmp/test.jq'
        with open(p, 'w') as f:
            f.write('.[] | {k: .key}')
        prog = await jq_cache.load(p)
        print('loaded', type(prog))

    asyncio.run(demo())
