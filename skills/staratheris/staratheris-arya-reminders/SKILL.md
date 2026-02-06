---
name: arya-reminders
description: Recordatorios en lenguaje natural (Bogotá). Crea cron jobs seguros y registra en markdown (y opcionalmente Sheets).
metadata:
  openclaw:
    emoji: '⏰'
    requires:
      bins: ['bash', 'python3']
---

# Arya Reminders

Recordatorios en lenguaje natural para OpenClaw, diseñados para Jaider.

## Qué hace

- Interpreta fechas/horas relativas y absolutas en español (y formatos comunes).
- Usa **America/Bogota** por defecto.
- Crea recordatorios **one-shot** (una sola vez) como cron jobs.
- Registra cada recordatorio en `memory/reminders.md`.
- (Opcional futuro) registrar en Google Sheets cuando esté habilitado.

## Uso (conversacional)

Ejemplos:

- "Recuérdame pagar la luz mañana a las 3pm"
- "Recuérdame en 45 minutos revisar el horno"
- "Recuérdame hoy a las 5:30pm llamar a mamá"
- "Recuérdame el viernes a las 9am entregar el taller"

## Comandos (manual)

### Crear recordatorio (una vez)

```bash
bash skills/arya-reminders/create-reminder.sh "Mensaje" "Cuándo"
```

### Revisar log

```bash
cat memory/reminders.md
```

## Notas

- No requiere APIs externas.
- Usa el tool `cron` del Gateway (no hardcodea rutas ni IDs ajenos).
