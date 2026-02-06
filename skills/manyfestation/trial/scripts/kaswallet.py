#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import inspect
import json
import os
import re
import sys
from typing import Any, Awaitable, Optional


NETWORK = os.environ.get("KASPA_NETWORK", "mainnet")
MNEMONIC = os.environ.get("KASPA_MNEMONIC")
PRIVATE_KEY = os.environ.get("KASPA_PRIVATE_KEY")
RPC_URL = os.environ.get("KASPA_RPC_URL")
RPC_CONNECT_TIMEOUT_MS = int(os.environ.get("KASPA_RPC_CONNECT_TIMEOUT_MS", "15000"))


def _json(obj: Any) -> None:
    def default(v: Any) -> Any:
        if isinstance(v, (bytes, bytearray)):
            return v.hex()
        try:
            import decimal

            if isinstance(v, decimal.Decimal):
                return str(v)
        except Exception:
            pass
        return str(v)

    print(json.dumps(obj, default=default, indent=2))

def get_any(obj: Any, *names: str, default: Any = None) -> Any:
    for name in names:
        if obj is None:
            continue
        if isinstance(obj, dict):
            if name in obj:
                return obj[name]
        else:
            if hasattr(obj, name):
                return getattr(obj, name)
    return default


def sompi_to_kas(sompi: int) -> str:
    return ("%0.8f" % (sompi / 1e8)).rstrip("0").rstrip(".")


def kas_to_sompi(kas: str) -> int:
    return int(round(float(kas) * 1e8))

_ADDRESS_WITH_PREFIX_RE = re.compile(r"(kaspa(?:test|dev|sim)?):[0-9a-z]+", re.IGNORECASE)
_ADDRESS_PAYLOAD_RE = re.compile(r"\b[0-9a-z]{20,}\b", re.IGNORECASE)


def _network_address_prefix() -> str:
    n = (NETWORK or "").lower()
    if n.startswith("testnet"):
        return "kaspatest"
    if n.startswith("devnet"):
        return "kaspadev"
    if n.startswith("simnet"):
        return "kaspasim"
    return "kaspa"


def normalize_address(value: str) -> str:
    s = (value or "").strip()
    if not s:
        return s
    if "?" in s:
        s = s.split("?", 1)[0]
    s = s.strip()
    if ":" not in s:
        s = f"{_network_address_prefix()}:{s}"
    return s


def sanitize_address_input(value: Any) -> str:
    """
    The Python `kaspa` binding sometimes renders address objects as debug-y strings
    like `<Address ...>`; extract the real address and ensure it has the correct prefix.
    """
    # First, try to get string from Address objects using to_string() method
    if not isinstance(value, str) and value is not None:
        for name in ("to_string", "toString", "as_string", "asString"):
            fn = getattr(value, name, None)
            if fn:
                try:
                    s = fn()
                    if isinstance(s, str) and s and not s.startswith("<"):
                        return normalize_address(s.strip())
                except Exception:
                    pass

    s = (value or "").strip() if isinstance(value, str) else str(value).strip()

    # First, try to extract a full prefixed address.
    m = _ADDRESS_WITH_PREFIX_RE.search(s)
    if m:
        return normalize_address(m.group(0))

    # Next, try to extract a payload-only address.
    m = _ADDRESS_PAYLOAD_RE.search(s)
    if m:
        return normalize_address(m.group(0))

    # Last resort: strip common wrappers and normalize.
    s = s.strip("<> \t\r\n")
    return normalize_address(s)


def make_address(kaspa: Any, value: str) -> Any:
    Address = getattr(kaspa, "Address", None)
    if not Address:
        raise RuntimeError("kaspa SDK missing Address")

    s = sanitize_address_input(value)

    for name in ("try_from", "tryFrom", "from_string", "fromString", "parse"):
        fn = getattr(Address, name, None)
        if fn:
            return fn(s)

    try:
        return Address(s)
    except Exception as e:
        # Some bindings may expect payload without the `kaspa:` prefix. Try that too.
        if ":" in s:
            payload = s.split(":", 1)[1]
            try:
                return Address(payload)
            except Exception:
                pass
        raise e


def make_payment_output(kaspa: Any, to: str, amount: int) -> Any:
    PaymentOutput = getattr(kaspa, "PaymentOutput", None)
    if not PaymentOutput:
        raise RuntimeError("kaspa SDK missing PaymentOutput")

    addr_str = sanitize_address_input(to)
    try:
        dest = make_address(kaspa, addr_str)
        return PaymentOutput(dest, amount)
    except Exception:
        # Fallback: try passing raw address string if supported by the binding
        return PaymentOutput(addr_str, amount)


async def maybe_await(value: Any) -> Any:
    if inspect.isawaitable(value):
        return await value
    return value


async def _with_timeout(awaitable: Awaitable[Any], label: str) -> Any:
    if RPC_CONNECT_TIMEOUT_MS <= 0:
        return await awaitable
    try:
        return await asyncio.wait_for(awaitable, timeout=RPC_CONNECT_TIMEOUT_MS / 1000)
    except asyncio.TimeoutError as e:
        raise RuntimeError(f"{label} timed out after {RPC_CONNECT_TIMEOUT_MS}ms") from e


def _require_wallet_secret() -> None:
    if not MNEMONIC and not PRIVATE_KEY:
        raise RuntimeError(
            "No wallet credentials. Set one of:\n"
            "  export KASPA_PRIVATE_KEY='your-64-char-hex-key'\n"
            "  export KASPA_MNEMONIC='your 12 or 24 word seed phrase'"
        )


def load_kaspa():
    try:
        import kaspa  # type: ignore

        return kaspa
    except Exception as e:
        raise RuntimeError("Missing Python dependency 'kaspa'. Run: python3 install.py") from e


def address_to_string(kaspa: Any, addr_obj: Any) -> str:
    for name in ("to_string", "toString", "as_string", "asString"):
        fn = getattr(addr_obj, name, None)
        if fn:
            try:
                return sanitize_address_input(fn())
            except Exception:
                pass
    return sanitize_address_input(addr_obj)


async def rpc_client():
    kaspa = load_kaspa()
    Resolver = getattr(kaspa, "Resolver", None)
    RpcClient = getattr(kaspa, "RpcClient", None)
    if not Resolver or not RpcClient:
        raise RuntimeError("kaspa SDK missing Resolver/RpcClient")

    if RPC_URL:
        client = RpcClient(url=RPC_URL, network_id=NETWORK)
    else:
        client = RpcClient(resolver=Resolver(), network_id=NETWORK)

    await _with_timeout(client.connect(), "RPC connect")
    return client


async def wallet():
    _require_wallet_secret()
    kaspa = load_kaspa()

    def call_any(obj: Any, names: list[str], *args: Any) -> Any:
        for name in names:
            fn = getattr(obj, name, None)
            if fn:
                return fn(*args)
        raise AttributeError(f"Missing method(s): {', '.join(names)}")

    if MNEMONIC:
        Mnemonic = getattr(kaspa, "Mnemonic", None)
        XPrv = getattr(kaspa, "XPrv", None)
        PrivateKeyGenerator = getattr(kaspa, "PrivateKeyGenerator", None)
        if not (Mnemonic and XPrv and PrivateKeyGenerator):
            raise RuntimeError("kaspa SDK missing Mnemonic/XPrv/PrivateKeyGenerator")

        m = Mnemonic(MNEMONIC)
        seed = call_any(m, ["to_seed", "toSeed"])
        x = XPrv(seed)
        gen = PrivateKeyGenerator(x, False, 0)
        key = call_any(gen, ["receive_key", "receiveKey"], 0)
    else:
        PrivateKey = getattr(kaspa, "PrivateKey", None)
        if not PrivateKey:
            raise RuntimeError("kaspa SDK missing PrivateKey")
        key = PrivateKey(PRIVATE_KEY)

    pub = call_any(key, ["to_public_key", "toPublicKey"])
    addr = call_any(pub, ["to_address", "toAddress"], NETWORK)
    return key, addr


def _pick_feerate(estimate: Any, tier: str) -> tuple[float, float]:
    # estimate: { priority_bucket, normal_buckets, low_buckets } (names vary slightly)
    if not estimate:
        return 1.0, 0.0

    priority = getattr(estimate, "priority_bucket", None) or estimate.get("priority_bucket") or estimate.get("priorityBucket")
    normal = getattr(estimate, "normal_buckets", None) or estimate.get("normal_buckets") or estimate.get("normalBuckets")
    low = getattr(estimate, "low_buckets", None) or estimate.get("low_buckets") or estimate.get("lowBuckets")

    def bucket_value(b: Any) -> tuple[float, float]:
        if b is None:
            return 1.0, 0.0
        feerate = getattr(b, "feerate", None)
        secs = getattr(b, "estimated_seconds", None)
        if feerate is None and isinstance(b, dict):
            feerate = b.get("feerate")
        if secs is None and isinstance(b, dict):
            secs = b.get("estimated_seconds") or b.get("estimatedSeconds")
        return float(feerate or 1.0), float(secs or 0.0)

    if tier == "priority":
        return bucket_value(priority)
    if tier == "economic":
        if normal and len(normal) > 0:
            return bucket_value(normal[0])
        return bucket_value(priority)
    if tier == "low":
        if low and len(low) > 0:
            return bucket_value(low[0])
        if normal and len(normal) > 0:
            return bucket_value(normal[0])
        return bucket_value(priority)

    return 1.0, 0.0


async def cmd_info(_: argparse.Namespace) -> None:
    c = await rpc_client()
    try:
        dag = await c.get_block_dag_info()
        srv = await c.get_server_info()
        blocks = get_any(dag, "block_count", "blockCount")
        synced = get_any(srv, "is_synced", "isSynced")
        version = get_any(srv, "server_version", "serverVersion")
        _json({"network": NETWORK, "url": getattr(c, "url", None), "blocks": blocks, "synced": synced, "version": version})
    finally:
        await maybe_await(c.disconnect())


async def cmd_balance(args: argparse.Namespace) -> None:
    c = await rpc_client()
    try:
        kaspa = load_kaspa()
        address = args.address
        if not address:
            _, addr = await wallet()
            address = address_to_string(kaspa, addr)
        address = sanitize_address_input(address)
        r = await c.get_balance_by_address({"address": address})
        balance = int(get_any(r, "balance", default=0))
        _json({"address": address, "balance": sompi_to_kas(balance), "sompi": str(balance), "network": NETWORK})
    finally:
        await maybe_await(c.disconnect())


async def cmd_fees(_: argparse.Namespace) -> None:
    c = await rpc_client()
    try:
        resp = await c.get_fee_estimate()
        estimate = resp.estimate if hasattr(resp, "estimate") else resp.get("estimate")
        tiers = {}
        for t in ("low", "economic", "priority"):
            feerate, secs = _pick_feerate(estimate, t)
            tiers[t] = {"feerate": feerate, "estimatedSeconds": secs}
        _json({"network": NETWORK, **tiers})
    finally:
        await maybe_await(c.disconnect())


async def _get_utxos(c: Any, address: str) -> list[Any]:
    resp = await c.get_utxos_by_addresses({"addresses": [address]})
    # The response can be an object with .entries or a dict with "entries"
    entries = getattr(resp, "entries", None)
    if entries is None and isinstance(resp, dict):
        entries = resp.get("entries")
    return list(entries or [])


def _create_generator(kaspa: Any, *, entries: list[Any], change_address: Any, outputs: list[Any], priority_fee: int = 0) -> Any:
    """Create a Generator instance for transaction building/estimation."""
    Generator = getattr(kaspa, "Generator", None)
    if not Generator:
        raise RuntimeError("kaspa SDK missing Generator")

    return Generator(
        network_id=NETWORK,
        entries=entries,
        change_address=change_address,
        outputs=outputs,
        priority_fee=priority_fee,
    )


async def _estimate_max_amount(kaspa: Any, *, utxos: list[Any], to: str, balance: int, change_address: Any, fee_rate: float, priority_fee: int) -> dict[str, Any]:
    """Estimate the maximum sendable amount after fees."""

    def estimate_for(amount: int) -> dict[str, Any]:
        outputs = [make_payment_output(kaspa, to, amount)]
        gen = _create_generator(kaspa, entries=utxos, change_address=change_address, outputs=outputs, priority_fee=priority_fee)
        summary = gen.estimate()
        return {"fees": int(summary.fees), "mass": int(summary.mass), "transactions": int(summary.transactions)}

    # Probe with minimal amount to get base fee
    probe = estimate_for(1)
    fees = probe["fees"]
    amount = balance - fees
    if amount <= 0:
        raise RuntimeError("Insufficient funds (balance does not cover transaction fees)")

    # Iterate to converge on final amount
    for _ in range(3):
        est = estimate_for(amount)
        new_fees = est["fees"]
        new_amount = balance - new_fees
        if new_amount == amount:
            return {"amount": amount, "fees": new_fees, "mass": est["mass"], "transactions": est["transactions"]}
        amount, fees = new_amount, new_fees
        if amount <= 0:
            raise RuntimeError("Insufficient funds (balance does not cover transaction fees)")

    est = estimate_for(amount)
    return {"amount": amount, "fees": est["fees"], "mass": est["mass"], "transactions": est["transactions"]}


async def _estimate_for_amount(kaspa: Any, *, utxos: list[Any], to: str, amount: int, change_address: Any, fee_rate: float, priority_fee: int) -> Any:
    """Estimate fees for a specific amount."""
    outputs = [make_payment_output(kaspa, to, amount)]
    gen = _create_generator(kaspa, entries=utxos, change_address=change_address, outputs=outputs, priority_fee=priority_fee)
    return gen.estimate()


async def cmd_estimate(args: argparse.Namespace) -> None:
    kaspa = load_kaspa()
    _, addr = await wallet()
    c = await rpc_client()
    try:
        from_addr = address_to_string(kaspa, addr)
        utxos = await _get_utxos(c, from_addr)
        if not utxos:
            raise RuntimeError("No UTXOs")

        bal_resp = await c.get_balance_by_address({"address": from_addr})
        bal = int(get_any(bal_resp, "balance", default=0))
        priority_fee = kas_to_sompi(args.priority_fee) if args.priority_fee else 0
        resp = await c.get_fee_estimate()
        estimate = resp.estimate if hasattr(resp, "estimate") else resp.get("estimate")

        tiers = [args.tier] if args.tier else ["low", "economic", "priority"]
        results = []
        to_addr = sanitize_address_input(args.to)
        for t in tiers:
            feerate, secs = _pick_feerate(estimate, t)
            if args.amount == "max":
                max_info = await _estimate_max_amount(
                    kaspa,
                    utxos=utxos,
                    to=to_addr,
                    balance=bal,
                    change_address=addr,
                    fee_rate=feerate,
                    priority_fee=priority_fee,
                )
                results.append(
                    {
                        "tier": t,
                        "feerate": feerate,
                        "estimatedSeconds": secs,
                        "mass": str(max_info["mass"]),
                        "feesSompi": str(max_info["fees"]),
                        "feesKas": sompi_to_kas(max_info["fees"]),
                        "sendAmountKas": sompi_to_kas(max_info["amount"]),
                    }
                )
            else:
                amount = kas_to_sompi(args.amount)
                est = await _estimate_for_amount(
                    kaspa,
                    utxos=utxos,
                    to=to_addr,
                    amount=amount,
                    change_address=addr,
                    fee_rate=feerate,
                    priority_fee=priority_fee,
                )
                results.append(
                    {
                        "tier": t,
                        "feerate": feerate,
                        "estimatedSeconds": secs,
                        "mass": str(int(est.mass)),
                        "feesSompi": str(int(est.fees)),
                        "feesKas": sompi_to_kas(int(est.fees)),
                        "sendAmountKas": args.amount,
                    }
                )

        _json(
            {
                "network": NETWORK,
                "from": from_addr,
                "to": to_addr,
                "balanceKas": sompi_to_kas(bal),
                "amountArg": args.amount,
                "priorityFeeKas": sompi_to_kas(priority_fee),
                "estimates": results,
            }
        )
    finally:
        await maybe_await(c.disconnect())


async def cmd_send(args: argparse.Namespace) -> None:
    kaspa = load_kaspa()
    key, addr = await wallet()
    c = await rpc_client()
    try:
        from_addr = address_to_string(kaspa, addr)
        utxos = await _get_utxos(c, from_addr)
        if not utxos:
            raise RuntimeError("No UTXOs")

        bal_resp = await c.get_balance_by_address({"address": from_addr})
        bal = int(get_any(bal_resp, "balance", default=0))
        priority_fee = kas_to_sompi(args.priority_fee) if args.priority_fee else 0

        fee_rate = 1.0
        tier = args.tier or "economic"
        try:
            resp = await c.get_fee_estimate()
            estimate = resp.estimate if hasattr(resp, "estimate") else resp.get("estimate")
            fee_rate, _ = _pick_feerate(estimate, tier)
        except Exception:
            fee_rate = 1.0

        to_addr = sanitize_address_input(args.to)

        if args.amount == "max":
            max_info = await _estimate_max_amount(
                kaspa,
                utxos=utxos,
                to=to_addr,
                balance=bal,
                change_address=addr,
                fee_rate=fee_rate,
                priority_fee=priority_fee,
            )
            amount = int(max_info["amount"])
        else:
            amount = kas_to_sompi(args.amount)

        if amount <= 0:
            raise RuntimeError(f"Insufficient balance: {sompi_to_kas(bal)} KAS")

        # Create outputs and generator
        outputs = [make_payment_output(kaspa, to_addr, amount)]
        gen = _create_generator(kaspa, entries=utxos, change_address=addr, outputs=outputs, priority_fee=priority_fee)

        # Process transactions from generator
        txids = []
        total_fees = 0
        for pending_tx in gen:
            # Sign and submit
            pending_tx.sign([key])
            txid = await maybe_await(pending_tx.submit(c))
            txids.append(str(txid))
            total_fees += int(pending_tx.fee_amount) if hasattr(pending_tx, "fee_amount") else 0

        # Get summary if available
        summary = gen.summary() if hasattr(gen, "summary") else None
        fees = int(summary.fees) if summary and hasattr(summary, "fees") else total_fees

        _json(
            {
                "status": "sent",
                "txid": txids[0] if txids else None,
                "from": from_addr,
                "to": to_addr,
                "amount": sompi_to_kas(amount),
                "tier": tier,
                "feeRate": fee_rate,
                "priorityFee": sompi_to_kas(priority_fee),
                "fee": sompi_to_kas(fees) if fees else None,
            }
        )
    finally:
        await maybe_await(c.disconnect())


async def cmd_uri(args: argparse.Namespace) -> None:
    address = args.address
    if not address:
        _, addr = await wallet()
        address = str(addr)

    qs = []
    if args.amount:
        qs.append(f"amount={args.amount}")
    if args.message:
        qs.append(f"message={args.message}")
    suffix = ("?" + "&".join(qs)) if qs else ""
    _json({"uri": f"{normalize_address(address)}{suffix}"})


async def cmd_generate_mnemonic(_: argparse.Namespace) -> None:
    kaspa = load_kaspa()
    Mnemonic = getattr(kaspa, "Mnemonic", None)
    if not Mnemonic:
        raise RuntimeError("kaspa SDK missing Mnemonic")
    m = Mnemonic.random()
    phrase = getattr(m, "phrase", None) or (m.get("phrase") if isinstance(m, dict) else None) or str(m)
    _json({"mnemonic": phrase})


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="kaswallet", add_help=False)
    sub = p.add_subparsers(dest="cmd", required=False)

    help_p = sub.add_parser("help")

    info_p = sub.add_parser("info")
    info_p.set_defaults(func=cmd_info)

    bal_p = sub.add_parser("balance")
    bal_p.add_argument("address", nargs="?")
    bal_p.set_defaults(func=cmd_balance)

    fees_p = sub.add_parser("fees")
    fees_p.set_defaults(func=cmd_fees)

    est_p = sub.add_parser("estimate")
    est_p.add_argument("to")
    est_p.add_argument("amount", help="KAS amount or 'max'")
    est_p.add_argument("tier", nargs="?", choices=["low", "economic", "priority"])
    est_p.add_argument("priority_fee", nargs="?", help="Optional priority fee (KAS)")
    est_p.set_defaults(func=cmd_estimate)

    send_p = sub.add_parser("send")
    send_p.add_argument("to")
    send_p.add_argument("amount", help="KAS amount or 'max'")
    send_p.add_argument("tier", nargs="?", choices=["low", "economic", "priority"])
    send_p.add_argument("priority_fee", nargs="?", help="Optional priority fee (KAS)")
    send_p.set_defaults(func=cmd_send)

    uri_p = sub.add_parser("uri")
    uri_p.add_argument("address", nargs="?")
    uri_p.add_argument("amount", nargs="?")
    uri_p.add_argument("message", nargs="?")
    uri_p.set_defaults(func=cmd_uri)

    gen_p = sub.add_parser("generate-mnemonic")
    gen_p.set_defaults(func=cmd_generate_mnemonic)

    p.add_argument("-h", "--help", action="store_true")
    return p


def print_help() -> None:
    print(
        """Kaspa Wallet CLI (PyPI kaspa SDK)

Commands:
  balance [address]                    Check balance (uses wallet if no address)
  fees                                 Show fee tiers from node
  info                                 Network info
  estimate <to> <amount|max> [tier]    Estimate fees (defaults: low/economic/priority)
  send <to> <amount|max> [tier]        Send KAS (tier: low|economic|priority; optional priorityFee as last arg)
  uri [address] [amount] [msg]         Generate payment URI
  generate-mnemonic                    Generate new 24-word mnemonic

Environment:
  KASPA_MNEMONIC      Wallet seed phrase
  KASPA_PRIVATE_KEY   Or private key hex
  KASPA_NETWORK       mainnet (default), testnet-10
  KASPA_RPC_URL       Optional direct wRPC url (ws:// or wss://)
  KASPA_RPC_CONNECT_TIMEOUT_MS  RPC connect timeout (ms)
"""
    )


def _format_error(e: Exception) -> dict[str, Any]:
    """Format error with helpful context for agents."""
    msg = str(e)
    result: dict[str, Any] = {"error": msg}

    # Add actionable hints for common errors
    if "Storage mass exceeds maximum" in msg:
        result["errorCode"] = "STORAGE_MASS_EXCEEDED"
        result["hint"] = (
            "Amount too small relative to UTXOs. Fix: send 'max' to your own address first to consolidate UTXOs, then retry."
        )
        result["action"] = "consolidate_utxos"
    elif "No UTXOs" in msg:
        result["errorCode"] = "NO_UTXOS"
        result["hint"] = "Wallet has no spendable outputs. Either empty or funds are unconfirmed."
    elif "Insufficient" in msg:
        result["errorCode"] = "INSUFFICIENT_FUNDS"
        result["hint"] = "Not enough balance for this transaction including fees."
    elif "timed out" in msg.lower():
        result["errorCode"] = "RPC_TIMEOUT"
        result["hint"] = "Network connection slow. Retry or set KASPA_RPC_CONNECT_TIMEOUT_MS=60000"
    elif "KASPA_MNEMONIC" in msg or "KASPA_PRIVATE_KEY" in msg:
        result["errorCode"] = "NO_CREDENTIALS"
        result["hint"] = "Set KASPA_PRIVATE_KEY or KASPA_MNEMONIC environment variable."
    elif "kaspa" in msg.lower() and ("import" in msg.lower() or "missing" in msg.lower()):
        result["errorCode"] = "SDK_NOT_INSTALLED"
        result["hint"] = "Run: python3 install.py"

    return result


async def main_async(argv: list[str]) -> int:
    parser = build_parser()
    ns, _ = parser.parse_known_args(argv)

    if ns.help or ns.cmd in (None, "help"):
        print_help()
        return 0

    func = getattr(ns, "func", None)
    if not func:
        print_help()
        return 1

    try:
        await func(ns)
        return 0
    except Exception as e:
        _json(_format_error(e))
        return 1


def main() -> int:
    return asyncio.run(main_async(sys.argv[1:]))


if __name__ == "__main__":
    raise SystemExit(main())
