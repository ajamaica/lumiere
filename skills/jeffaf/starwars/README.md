# ⚔️ Star Wars Lookup

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/jeffaf/starwars-skill)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A CLI for AI agents to lookup Star Wars universe info for their humans. "What planet is Yoda from?" — now your agent can answer.

Uses [SWAPI](https://swapi.dev) (Star Wars API).

**Built for [OpenClaw](https://github.com/openclaw/openclaw)** — works standalone too.

## Features

- 🧑 Search characters (with species & homeworld resolution)
- 🌍 Search planets
- 🎬 List all films
- 👽 Search species
- 🚀 Search starships
- 🎯 No API key or account required

## Installation

### Via ClawHub

```bash
clawhub install starwars
```

### Manual

```bash
git clone https://github.com/jeffaf/starwars-skill.git
cd starwars-skill
chmod +x scripts/starwars
# Add to PATH or symlink
ln -s $(pwd)/scripts/starwars /usr/local/bin/starwars
```

## Requirements

- `bash`
- `curl`
- `jq`

## Usage

```bash
# Search characters
starwars people "luke"
starwars people "vader"

# Search planets
starwars planets "tatooine"
starwars planets "hoth"

# List all films
starwars films

# Search species
starwars species "wookiee"
starwars species "droid"

# Search starships
starwars starships "falcon"
starwars starships "x-wing"
```

## Example Output

```
$ starwars people "luke"
Luke Skywalker — Human, Tatooine, Height: 172cm

$ starwars planets "tatooine"
Tatooine — Population: 200000, Climate: arid, Terrain: desert

$ starwars films
Episode 1: The Phantom Menace (1999-05-19) — Director: George Lucas
Episode 2: Attack of the Clones (2002-05-16) — Director: George Lucas
Episode 3: Revenge of the Sith (2005-05-19) — Director: George Lucas
Episode 4: A New Hope (1977-05-25) — Director: George Lucas
Episode 5: The Empire Strikes Back (1980-05-17) — Director: Irvin Kershner
Episode 6: Return of the Jedi (1983-05-25) — Director: Richard Marquand

$ starwars species "wookiee"
Wookiee — Classification: mammal, Language: Shyriiwook, Avg Lifespan: 400 years

$ starwars starships "falcon"
Millennium Falcon — YT-1300 light freighter, Class: Light freighter, Crew: 4
```

## API

Uses [SWAPI](https://swapi.dev) — the Star Wars API.

- Free and open
- No authentication required
- Covers Episodes 1-6

## License

MIT
