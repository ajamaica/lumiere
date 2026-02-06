"""
Benchmark and metrics collector
- Measure API call latency and throughput
- Simple JSON metrics output to metrics.json
"""
from __future__ import annotations
import time
import asyncio
import statistics
import json
from typing import List, Dict, Any


async def run_benchmark(client_getter, paths: List[str], concurrency: int = 20, iterations: int = 100) -> Dict[str, Any]:
    """Run simple benchmark: measure latency for client.get on provided paths."""
    latencies: List[float] = []
    start = time.time()

    sem = asyncio.Semaphore(concurrency)

    async def worker(path):
        async with sem:
            t0 = time.time()
            await client_getter(path)
            t1 = time.time()
            latencies.append(t1 - t0)

    tasks = []
    for i in range(iterations):
        for p in paths:
            tasks.append(asyncio.create_task(worker(p)))
    await asyncio.gather(*tasks)
    total_time = time.time() - start

    metrics = {
        'requests': len(latencies),
        'total_time_s': total_time,
        'rps': len(latencies) / total_time if total_time > 0 else None,
        'latency_mean_s': statistics.mean(latencies) if latencies else None,
        'latency_median_s': statistics.median(latencies) if latencies else None,
        'latency_p90_s': statistics.quantiles(latencies, n=100)[89] if len(latencies) >= 100 else None,
    }
    # save
    with open('metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)
    return metrics


if __name__ == "__main__":
    import aiohttp
    from async_api import AsyncAPIClient

    async def main():
        client = AsyncAPIClient(concurrency=10, rate=20, per=1)
        async def getter(path):
            await client.get(path)
        metrics = await run_benchmark(getter, ['/api/v3/time'], concurrency=10, iterations=10)
        print(metrics)
        await client.close()

    asyncio.run(main())
