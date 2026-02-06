# Auto-completion Setup

Enable shell auto-completion for hass-cli commands and entity IDs.

## Bash

Add to `~/.bashrc`:

```bash
eval "$(_HASS_CLI_COMPLETE=bash_source hass-cli)"
```

Then reload:

```bash
source ~/.bashrc
```

## Zsh

Add to `~/.zshrc`:

```bash
eval "$(_HASS_CLI_COMPLETE=zsh_source hass-cli)"
```

Then reload:

```bash
source ~/.zshrc
```

## Fish

Run:

```bash
eval (env _HASS_CLI_COMPLETE=fish_source hass-cli)
```

## Usage

Once enabled, auto-completion works for:

- Commands: `hass-cli <TAB>`
- Entity IDs: `hass-cli state get light.<TAB>`
- Services: `hass-cli service call light.<TAB>`

## Requirements

Auto-completion requires environment variables to be set:

```bash
export HASS_SERVER=https://homeassistant.local:8123
export HASS_TOKEN=<your-token>
```

Without these, auto-completion for entity IDs won't work.
