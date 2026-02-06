# attio-cli

Interact with your Attio CRM workspace via the attio-cli.

## Install

1. Clone and install the CLI:

```bash
git clone https://github.com/FroeMic/attio-cli
cd attio-cli
npm install
npm link
```

2. Set `ATTIO_API_KEY` environment variable (get it from Attio Settings > Developers > API Keys):
   - **Recommended:** Add to `~/.claude/.env` for Claude Code
   - **Alternative:** Add to `~/.bashrc` or `~/.zshrc`: `export ATTIO_API_KEY="your-api-key"`

**Repository:** https://github.com/FroeMic/attio-cli

## Commands

List objects and records:

```bash
attio object list                      # List all objects
attio record list people               # List people records
attio record list companies            # List company records
```

Work with lists (pipelines):

```bash
attio list list-all                    # List all lists
attio entry list <list-slug>           # List entries in a list
```

Get detailed info:

```bash
attio object get <object-slug>         # Get object details
attio object attributes <object-slug>  # Get object attributes
attio list attributes <list-slug>      # Get list entry attributes
```

## Generate Workspace Schema

Generate a markdown schema of your workspace for context:

```bash
bash {baseDir}/scripts/generate-schema.sh > {baseDir}/workspace.schema.md
```

This creates a reference file documenting all objects, attributes, lists, and field options in your workspace.

## Key Concepts

| Concept     | Purpose                      | Example                      |
| ----------- | ---------------------------- | ---------------------------- |
| **Objects** | Base record types            | People, Companies, Deals     |
| **Lists**   | Pipeline/workflow management | Sales Pipeline, Hiring       |
| **Records** | Individual items in objects  | A specific person or company |
| **Entries** | Records added to a list      | A deal in the Sales Pipeline |

## API Reference

- **Base URL:** `https://api.attio.com/v2`
- **Auth:** `Authorization: Bearer $ATTIO_API_KEY`
- **Rate Limits:** 100 requests per 10 seconds per workspace

## Common API Operations

Search for a person:

```bash
curl -X POST https://api.attio.com/v2/objects/people/records/query \
  -H "Authorization: Bearer $ATTIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filter": {"email_addresses": {"contains": "john@example.com"}}}'
```

Create a record:

```bash
curl -X POST https://api.attio.com/v2/objects/<object-slug>/records \
  -H "Authorization: Bearer $ATTIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data": {"values": {"name": [{"value": "Record Name"}]}}}'
```

Add entry to a list:

```bash
curl -X POST https://api.attio.com/v2/lists/<list-slug>/entries \
  -H "Authorization: Bearer $ATTIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data": {"parent_record_id": "<record-id>"}}'
```

## Notes

- Run `generate-schema.sh` after installing to create a workspace schema file with all your objects, lists, and field options.
- Lists are commonly used to manage pipelines (sales stages, hiring workflows, etc.).
- The CLI requires `jq` for JSON processing in schema generation.
