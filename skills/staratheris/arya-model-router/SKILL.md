---
name: arya-model-router
description: Token-saver router: elige modelo (cheap/default/pro) y usa sub-agentes para tareas pesadas. Incluye compresión/briefing opcional.
metadata:
  openclaw:
    emoji: "🧭"
    requires:
      bins: ["bash", "python3"]
---

# Arya Model Router (Token Saver)

Router de modelos para OpenClaw: decide cuándo usar un modelo barato vs uno más fuerte, reduciendo costo y tokens.

## Objetivos

- Mantener el chat diario barato.
- Escalar a un modelo superior solo cuando la tarea lo amerite.
- Evitar pasar contexto enorme al modelo caro: primero crear un **brief**.

## Enfoque

- El agente principal (main) se mantiene en un modelo económico.
- Para tareas pesadas, el router recomienda (o ejecuta) **sub-agentes** con un modelo superior.

## Niveles (por defecto)

- cheap: `openai/gpt-4o-mini`
- default: `openai/gpt-4.1-mini`
- pro: `openai/gpt-4.1`

## Uso (conceptual)

- "Router: responde esto en modo cheap" (forzado)
- "Router: analiza esto" (auto)

## Archivos

- `router.py`: clasificador + reglas
- `rules.json`: reglas editables
- `README.md`: documentación completa
