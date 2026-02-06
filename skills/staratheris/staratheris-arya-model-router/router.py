#!/usr/bin/env python3
"""Arya Model Router (Token Saver)

Implements 5 improvements:
1) Manual overrides via tags (@cheap/@default/@pro/@ultra) and commands (router status/auto on/off)
2) Briefing helper suggestion when context is large (brief_first)
3) Feedback loop: router feedback expensive|weak adjusts thresholds slightly
4) Response policy hints (max_words/style) per tier
5) Special handling for daily reports: keep default but enforce short structured output

This script is local-only: it does not call models. It outputs a JSON decision.
"""

import argparse
import json
import os
import re
from dataclasses import dataclass

STATE_PATH = os.path.join(os.path.dirname(__file__), 'state.json')


@dataclass
class Decision:
    level: str
    model: str
    score: int
    reasons: list
    actions: list
    response_policy: dict
    mode: str


def load_json(path: str, default: dict):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default


def save_json(path: str, obj: dict):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def tokenize(text: str):
    return re.findall(r"[\wáéíóúñü]+", text.lower())


def detect_override(text: str, rules: dict):
    # Tag overrides like @pro
    for tag, lvl in rules.get('overrides', {}).get('tag_map', {}).items():
        if tag.lower() in text.lower():
            return ('tag', lvl)
    return (None, None)


def detect_command(text: str, rules: dict):
    t = text.strip().lower()
    cmds = rules.get('overrides', {}).get('commands', {})
    if t in cmds:
        return t
    return None


def apply_feedback_adjustments(rules: dict, state: dict):
    # Light-touch auto tuning based on feedback counts.
    th = rules.get('thresholds', {})
    heavy = int(th.get('heavy_score', 6))
    default = int(th.get('default_score', 3))

    fb = state.get('feedback', {})
    expensive = int(fb.get('too_expensive', 0))
    weak = int(fb.get('too_weak', 0))

    # If user complains it's too expensive: make it harder to go pro.
    if expensive > weak and expensive >= 2:
        heavy = min(10, heavy + 1)
    # If user complains it's too weak: make it easier to go pro.
    if weak > expensive and weak >= 2:
        heavy = max(4, heavy - 1)

    th['heavy_score'] = heavy
    th['default_score'] = default
    rules['thresholds'] = th
    return rules


def score_text(text: str, rules: dict):
    tokens = tokenize(text)
    joined = " ".join(tokens)

    score = 0
    reasons = []

    # Daily report detection
    daily_hits = 0
    for kw in rules.get('signals', {}).get('daily_report_keywords', []):
        if kw.lower() in joined:
            daily_hits += 1

    # Length heuristic
    if len(text) > 1500:
        score += 2
        reasons.append("texto largo (>1500 chars)")
    if len(text) > 5000:
        score += 2
        reasons.append("texto muy largo (>5000 chars)")

    # Math / code patterns
    if re.search(r"(\d+\s*[/\-*+]\s*\d+|∫|Σ)", text):
        score += 2
        reasons.append("patrones de matemáticas/cálculo")
    if re.search(r"```|traceback|stack trace|exception|error:\s", text.lower()):
        score += 2
        reasons.append("patrones de debugging/código")

    # Keyword signals
    heavy_hits = 0
    for kw in rules.get('signals', {}).get('heavy_keywords', []):
        if kw.lower() in joined:
            heavy_hits += 1
    if heavy_hits:
        add = min(4, heavy_hits)
        score += add
        reasons.append(f"keywords pesadas detectadas ({heavy_hits})")

    light_hits = 0
    for kw in rules.get('signals', {}).get('light_keywords', []):
        if kw.lower() in joined:
            light_hits += 1
    if light_hits and score > 0:
        score -= 1
        reasons.append("keywords ligeras presentes (reduce score -1)")

    return max(0, score), reasons, (daily_hits > 0)


def decide(level_models: dict, thresholds: dict, response_policies: dict, score: int, context_chars: int, reasons: list, is_daily: bool):
    heavy_score = int(thresholds.get('heavy_score', 6))
    default_score = int(thresholds.get('default_score', 3))
    max_ctx = int(thresholds.get('max_context_chars_for_pro', 12000))

    actions = []

    if is_daily:
        # Keep it cheap-ish but structured; avoid pro unless clearly needed.
        level = 'default'
        reasons.append('modo reporte diario: preferir default + salida estructurada')
        actions.append('daily_report_mode')
    elif score >= heavy_score:
        level = 'pro'
        if context_chars > max_ctx:
            actions.append('brief_first')
            reasons.append(f"contexto grande ({context_chars} chars) → hacer brief antes de pro")
    elif score >= default_score:
        level = 'default'
    else:
        level = 'cheap'

    model = level_models.get(level, level_models.get('default'))

    if level in ('pro', 'ultra'):
        actions.append('use_subagent')
    else:
        actions.append('stay_main')

    policy = response_policies.get(level, {})
    return level, model, actions, policy


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--text', required=True)
    ap.add_argument('--context-chars', type=int, default=0)
    ap.add_argument('--rules', default=os.path.join(os.path.dirname(__file__), 'rules.json'))
    ap.add_argument('--state', default=STATE_PATH)
    args = ap.parse_args()

    rules = load_json(args.rules, {})
    state = load_json(args.state, {"mode": "auto", "lastDecision": None, "feedback": {"too_expensive": 0, "too_weak": 0}})

    cmd = detect_command(args.text, rules)
    if cmd:
        if cmd == 'router status':
            out = {"mode": state.get('mode', 'auto'), "lastDecision": state.get('lastDecision')}
            print(json.dumps(out, ensure_ascii=False))
            return
        if cmd == 'router auto on':
            state['mode'] = 'auto'
            save_json(args.state, state)
            print(json.dumps({"ok": True, "mode": "auto"}, ensure_ascii=False))
            return
        if cmd == 'router auto off':
            state['mode'] = 'off'
            save_json(args.state, state)
            print(json.dumps({"ok": True, "mode": "off"}, ensure_ascii=False))
            return

    # Feedback commands
    t = args.text.strip().lower()
    if t in ('router feedback expensive', 'router feedback caro'):
        state['feedback']['too_expensive'] = int(state['feedback'].get('too_expensive', 0)) + 1
        save_json(args.state, state)
        print(json.dumps({"ok": True, "feedback": state['feedback']}, ensure_ascii=False))
        return
    if t in ('router feedback weak', 'router feedback debil'):
        state['feedback']['too_weak'] = int(state['feedback'].get('too_weak', 0)) + 1
        save_json(args.state, state)
        print(json.dumps({"ok": True, "feedback": state['feedback']}, ensure_ascii=False))
        return

    # Auto-tune thresholds based on feedback
    rules = apply_feedback_adjustments(rules, state)

    mode = state.get('mode', 'auto')
    override_kind, override_level = detect_override(args.text, rules)

    score, reasons, is_daily = score_text(args.text, rules)

    if mode == 'off' and not override_level:
        # If auto routing is off, always stay cheap.
        level = 'cheap'
        model = rules['models'].get('cheap')
        actions = ['stay_main', 'auto_off']
        policy = rules.get('response_policies', {}).get('cheap', {})
        dec = Decision(level, model, score, reasons + ['router auto off'], actions, policy, mode)
    else:
        # Apply override if present
        if override_level:
            level = override_level
            model = rules['models'].get(level, rules['models'].get('default'))
            actions = ['stay_main' if level in ('cheap','default') else 'use_subagent', f'override:{override_kind}']
            policy = rules.get('response_policies', {}).get(level, {})
            reasons.append(f'override {override_kind}: {level}')
        else:
            level, model, actions, policy = decide(
                rules['models'],
                rules.get('thresholds', {}),
                rules.get('response_policies', {}),
                score,
                args.context_chars,
                reasons,
                is_daily,
            )

        dec = Decision(level, model, score, reasons, actions, policy, mode)

    out = {
        'mode': dec.mode,
        'level': dec.level,
        'model': dec.model,
        'score': dec.score,
        'reasons': dec.reasons,
        'actions': dec.actions,
        'response_policy': dec.response_policy,
        'helper_scripts': {
            'brief': 'python3 skills/arya-model-router/brief.py --max-chars 4000 < context.txt'
        }
    }

    state['lastDecision'] = {k: out[k] for k in ('level','model','score','actions')}
    save_json(args.state, state)

    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    main()
