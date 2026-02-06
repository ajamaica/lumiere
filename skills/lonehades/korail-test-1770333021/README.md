# Korail Manager Skill

A skill to automate KTX ticket reservation using a patched version of `korail2`.

## Setup

You must provide Korail credentials via environment variables or arguments.
(Currently configured to use `.env.korail` or passed args)

## Features

- **Search:** Find trains.
- **Watch:** Continuously check for a specific route/time and auto-reserve.
- **Cancel:** Cancel reservations (Patched to handle recent API changes).
