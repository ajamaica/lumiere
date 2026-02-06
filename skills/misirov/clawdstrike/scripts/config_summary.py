#!/usr/bin/env python3
import json
import os
import re
import sys
from urllib.parse import urlparse

SECRET_KEYWORDS = [
    "token",
    "password",
    "secret",
    "apikey",
    "api_key",
    "apptoken",
    "bottoken",
    "signingsecret",
    "cookie",
    "oauth",
    "privatekey",
    "session",
]

ENV_REF_RE = re.compile(r"^\$\{[A-Za-z0-9_]+\}$")


def is_env_ref(val: str) -> bool:
    return bool(ENV_REF_RE.match(val))


def is_secret_key(key: str) -> bool:
    k = key.lower()
    return any(word in k for word in SECRET_KEYWORDS)


def secret_state(val):
    if val is None:
        return "missing"
    if isinstance(val, str) and not val.strip():
        return "missing"
    if isinstance(val, str) and is_env_ref(val):
        return "envref"
    if isinstance(val, str):
        return "present"
    return "set"


def as_str(val):
    if val is None:
        return "missing"
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, str):
        return val if len(val) <= 120 else val[:117] + "..."
    if isinstance(val, list):
        return f"list(len={len(val)})"
    if isinstance(val, dict):
        return f"object(keys={len(val)})"
    return str(val)


def list_items(val):
    if val is None:
        return []
    if isinstance(val, list):
        return [str(x) for x in val]
    if isinstance(val, str):
        return [val]
    return []


def list_summary(val):
    items = list_items(val)
    if not items and val is None:
        return "missing"
    if not items and not isinstance(val, (list, str)):
        return "object"
    wildcard = any(x.strip() == "*" for x in items)
    return f"list(len={len(items)}, wildcard={str(wildcard).lower()})"


def url_summary(val):
    if not isinstance(val, str) or not val.strip():
        return "missing"
    try:
        parsed = urlparse(val)
        if not parsed.scheme or not parsed.netloc:
            return "set"
        host = parsed.hostname or ""
        port = f":{parsed.port}" if parsed.port else ""
        return f"{parsed.scheme}://{host}{port}"
    except Exception:
        return "set"


def basename_summary(val):
    if not isinstance(val, str) or not val.strip():
        return "missing"
    return os.path.basename(val)


def get_path(obj, path):
    cur = obj
    for part in path:
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None
    return cur


def scan_secrets(obj, prefix=None, secrets=None, envrefs=None):
    if prefix is None:
        prefix = []
    if secrets is None:
        secrets = set()
    if envrefs is None:
        envrefs = set()

    if isinstance(obj, dict):
        for key, val in obj.items():
            key_str = str(key)
            path = prefix + [key_str]
            if is_secret_key(key_str) and isinstance(val, str):
                path_str = ".".join(path)
                if is_env_ref(val):
                    envrefs.add(path_str)
                else:
                    secrets.add(path_str)
            if isinstance(val, (dict, list)):
                scan_secrets(val, path, secrets, envrefs)
    elif isinstance(obj, list):
        for item in obj:
            scan_secrets(item, prefix + ["*"], secrets, envrefs)

    return secrets, envrefs


def policy_list(policies):
    if not policies:
        return "missing"
    return "[" + ", ".join(sorted(policies)) + "]"


def summarize_channels(channels, lines):
    if not isinstance(channels, dict):
        return

    defaults = channels.get("defaults", {})
    if isinstance(defaults, dict):
        lines.append(f"channels.defaults.groupPolicy={as_str(defaults.get('groupPolicy'))}")
        dm_defaults = defaults.get("dm", {})
        if isinstance(dm_defaults, dict):
            lines.append(f"channels.defaults.dm.policy={as_str(dm_defaults.get('policy'))}")

    for provider, pdata in channels.items():
        if provider == "defaults":
            continue
        if not isinstance(pdata, dict):
            continue

        dm_policies = set()
        group_policies = set()
        dm_allow = []
        group_allow = []

        dm = pdata.get("dm", {})
        if isinstance(dm, dict):
            if isinstance(dm.get("policy"), str):
                dm_policies.add(dm["policy"])
            dm_allow.extend(list_items(dm.get("allowFrom")))

        if isinstance(pdata.get("groupPolicy"), str):
            group_policies.add(pdata.get("groupPolicy"))
        group_allow.extend(list_items(pdata.get("groupAllowFrom")))

        accounts = pdata.get("accounts", {})
        if isinstance(accounts, dict):
            for acct in accounts.values():
                if not isinstance(acct, dict):
                    continue
                dm_acct = acct.get("dm", {})
                if isinstance(dm_acct, dict):
                    if isinstance(dm_acct.get("policy"), str):
                        dm_policies.add(dm_acct.get("policy"))
                    dm_allow.extend(list_items(dm_acct.get("allowFrom")))
                if isinstance(acct.get("groupPolicy"), str):
                    group_policies.add(acct.get("groupPolicy"))
                group_allow.extend(list_items(acct.get("groupAllowFrom")))

        dm_allow_summary = list_summary(dm_allow if dm_allow else None)
        group_allow_summary = list_summary(group_allow if group_allow else None)

        lines.append(f"channels.{provider}.dm.policy={policy_list(dm_policies)}")
        lines.append(f"channels.{provider}.groupPolicy={policy_list(group_policies)}")
        lines.append(f"channels.{provider}.dm.allowFrom={dm_allow_summary}")
        lines.append(f"channels.{provider}.groupAllowFrom={group_allow_summary}")
        lines.append(f"channels.{provider}.accounts.count={as_str(len(accounts) if isinstance(accounts, dict) else 0)}")


def main():
    args = sys.argv[1:]
    if not args:
        print("error: missing config path")
        return 0

    extra_dirs_only = False
    if args[0] == "--extra-dirs":
        extra_dirs_only = True
        args = args[1:]

    config_path = args[0] if args else ""
    if not config_path or not os.path.exists(config_path):
        print("error: config file not found")
        return 0

    try:
        with open(config_path, "r", encoding="utf-8") as fh:
            cfg = json.load(fh)
    except Exception as exc:
        print(f"error: failed to parse config: {exc}")
        return 0

    extra_dirs = get_path(cfg, ["skills", "load", "extraDirs"])
    if extra_dirs_only:
        if isinstance(extra_dirs, list):
            for item in extra_dirs:
                if isinstance(item, str) and item.strip():
                    print(item)
        return 0

    lines = []
    lines.append(f"config.path={config_path}")

    # Gateway and Control UI
    lines.append(f"gateway.bind={as_str(get_path(cfg, ['gateway', 'bind']))}")
    lines.append(f"gateway.port={as_str(get_path(cfg, ['gateway', 'port']))}")
    lines.append(f"gateway.mode={as_str(get_path(cfg, ['gateway', 'mode']))}")
    lines.append(f"gateway.auth.mode={as_str(get_path(cfg, ['gateway', 'auth', 'mode']))}")
    lines.append(f"gateway.auth.token={secret_state(get_path(cfg, ['gateway', 'auth', 'token']))}")
    lines.append(f"gateway.auth.password={secret_state(get_path(cfg, ['gateway', 'auth', 'password']))}")
    lines.append(f"gateway.auth.allowTailscale={as_str(get_path(cfg, ['gateway', 'auth', 'allowTailscale']))}")
    lines.append(f"gateway.trustedProxies={list_summary(get_path(cfg, ['gateway', 'trustedProxies']))}")
    lines.append(f"gateway.tailscale.mode={as_str(get_path(cfg, ['gateway', 'tailscale', 'mode']))}")
    lines.append(f"gateway.controlUi.enabled={as_str(get_path(cfg, ['gateway', 'controlUi', 'enabled']))}")
    lines.append(f"gateway.controlUi.allowInsecureAuth={as_str(get_path(cfg, ['gateway', 'controlUi', 'allowInsecureAuth']))}")
    lines.append(f"gateway.controlUi.dangerouslyDisableDeviceAuth={as_str(get_path(cfg, ['gateway', 'controlUi', 'dangerouslyDisableDeviceAuth']))}")

    # Discovery
    lines.append(f"discovery.mdns.mode={as_str(get_path(cfg, ['discovery', 'mdns', 'mode']))}")
    lines.append(f"discovery.wideArea.enabled={as_str(get_path(cfg, ['discovery', 'wideArea', 'enabled']))}")

    # Canvas host
    lines.append(f"canvasHost.enabled={as_str(get_path(cfg, ['canvasHost', 'enabled']))}")
    lines.append(f"canvasHost.port={as_str(get_path(cfg, ['canvasHost', 'port']))}")
    lines.append(f"canvasHost.root={basename_summary(get_path(cfg, ['canvasHost', 'root']))}")
    lines.append(f"canvasHost.liveReload={as_str(get_path(cfg, ['canvasHost', 'liveReload']))}")

    # Tools and sandbox
    lines.append(f"tools.exec={as_str(get_path(cfg, ['tools', 'exec']))}")
    lines.append(f"tools.elevated.enabled={as_str(get_path(cfg, ['tools', 'elevated', 'enabled']))}")
    lines.append(f"tools.elevated.allowFrom={list_summary(get_path(cfg, ['tools', 'elevated', 'allowFrom']))}")
    lines.append(f"tools.web.search.enabled={as_str(get_path(cfg, ['tools', 'web', 'search', 'enabled']))}")
    lines.append(f"tools.web.fetch.enabled={as_str(get_path(cfg, ['tools', 'web', 'fetch', 'enabled']))}")
    lines.append(f"browser.enabled={as_str(get_path(cfg, ['browser', 'enabled']))}")
    lines.append(f"browser.cdpUrl={url_summary(get_path(cfg, ['browser', 'cdpUrl']))}")
    lines.append(f"agents.defaults.sandbox.mode={as_str(get_path(cfg, ['agents', 'defaults', 'sandbox', 'mode']))}")
    lines.append(f"agents.defaults.sandbox.workspaceAccess={as_str(get_path(cfg, ['agents', 'defaults', 'sandbox', 'workspaceAccess']))}")

    # Sessions and commands
    lines.append(f"session.dmScope={as_str(get_path(cfg, ['session', 'dmScope']))}")
    lines.append(f"commands.native={as_str(get_path(cfg, ['commands', 'native']))}")
    lines.append(f"commands.nativeSkills={as_str(get_path(cfg, ['commands', 'nativeSkills']))}")
    lines.append(f"commands.useAccessGroups={as_str(get_path(cfg, ['commands', 'useAccessGroups']))}")

    # Skills and plugins
    lines.append(f"skills.allowBundled={as_str(get_path(cfg, ['skills', 'allowBundled']))}")
    lines.append(f"skills.load.extraDirs.count={as_str(len(extra_dirs) if isinstance(extra_dirs, list) else 0)}")
    if isinstance(extra_dirs, list) and extra_dirs:
        basenames = [os.path.basename(p) for p in extra_dirs if isinstance(p, str)]
        lines.append(f"skills.load.extraDirs.basenames={','.join(basenames[:5])}")

    entries = get_path(cfg, ["skills", "entries"])
    enabled_count = 0
    env_count = 0
    if isinstance(entries, dict):
        for entry in entries.values():
            if isinstance(entry, dict):
                if entry.get("enabled", True) is not False:
                    enabled_count += 1
                if "env" in entry:
                    env_count += 1
    lines.append(f"skills.entries.enabled.count={as_str(enabled_count)}")
    lines.append(f"skills.entries.env.count={as_str(env_count)}")

    plugins = get_path(cfg, ["plugins"])
    if isinstance(plugins, dict):
        lines.append(f"plugins.allow={list_summary(plugins.get('allow'))}")
        lines.append(f"plugins.deny={list_summary(plugins.get('deny'))}")
        lines.append(f"plugins.load.paths={list_summary(get_path(plugins, ['load', 'paths']))}")
    else:
        lines.append("plugins.allow=missing")

    # Logging
    lines.append(f"logging.redactSensitive={as_str(get_path(cfg, ['logging', 'redactSensitive']))}")
    lines.append(f"logging.file={basename_summary(get_path(cfg, ['logging', 'file']))}")

    # Secrets on disk
    secrets, envrefs = scan_secrets(cfg)
    secrets_list = sorted(secrets)
    envrefs_list = sorted(envrefs)
    lines.append(f"secrets.on_disk.count={as_str(len(secrets_list))}")
    if secrets_list:
        preview = ",".join(secrets_list[:8])
        if len(secrets_list) > 8:
            preview += f",+{len(secrets_list) - 8} more"
        lines.append(f"secrets.on_disk.keys={preview}")
    lines.append(f"secrets.env_refs.count={as_str(len(envrefs_list))}")

    # Channels summary
    summarize_channels(get_path(cfg, ["channels"]), lines)

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
