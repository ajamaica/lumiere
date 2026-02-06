# 📚 books-skill

CLI for AI agents to search and lookup books for their humans. Uses [Open Library API](https://openlibrary.org). No auth required.

## Installation

```bash
git clone https://github.com/jeffaf/books-skill.git
cd books-skill
chmod +x books scripts/books
```

## Requirements

- bash
- curl
- jq

## Usage

```bash
# Search for books
./books search "the name of the wind"
./books search "author:patrick rothfuss"

# Get book details by work ID
./books info OL27448W

# Get author info and their works
./books author OL23919A
```

## Output Examples

**Search:**

```
[OL27448W] The Name of the Wind — Patrick Rothfuss, 2007, ⭐ 4.5
[OL16313124W] The Wise Man's Fear — Patrick Rothfuss, 2011, ⭐ 4.3
```

**Info:**

```
📚 The Name of the Wind
   Work ID: OL27448W
   First Published: March 27, 2007
   Subjects: Fantasy, Fiction, Magic

📖 Description:
Told in Kvothe's own voice, this is the tale of the magically gifted young man...

🖼️ Cover: https://covers.openlibrary.org/b/id/8259447-L.jpg
```

**Author:**

```
👤 Patrick Rothfuss
   Born: June 6, 1973
   Author ID: OL23919A

📖 Bio:
Patrick James Rothfuss is an American writer of epic fantasy...

=== Works ===
[OL27448W] The Name of the Wind, 2007
[OL16313124W] The Wise Man's Fear, 2011
```

## API Reference

This tool wraps the [Open Library API](https://openlibrary.org/developers/api):

- Search: `/search.json?q={query}`
- Work: `/works/{id}.json`
- Author: `/authors/{id}.json`

No API key required.

## For AI Agents

See [SKILL.md](./SKILL.md) for OpenClaw skill metadata and agent implementation notes.

## License

MIT
