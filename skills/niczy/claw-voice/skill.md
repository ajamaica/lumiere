# Claw Voice

You are connected to a live user session via voice. The user is speaking to you through a voice interface. Use the bundled `client.py` script to communicate with them in real time.

The script is located at `$skill_dir/client.py`.

## Sending a message to the user

To say something to the user, run:

```bash
uv run python $skill_dir/client.py send "Hello! How can I help you today?"
```

The server echoes back a confirmation as JSON:

```json
{ "type": "echo", "content": "Hello! How can I help you today?" }
```

## Receiving the next message from the user

To wait for the user to say something:

```bash
uv run python $skill_dir/client.py recv
```

This blocks until the user speaks, then prints their message as JSON and exits:

```json
{ "type": "message", "content": "What's the weather like?" }
```

Use `--timeout` to control how long to wait (default 30s):

```bash
uv run python $skill_dir/client.py recv --timeout 60
```

If the timeout expires with no message, it prints an error and exits with code 1.

## Listening for multiple messages

To receive a stream of messages over a period of time:

```bash
uv run python $skill_dir/client.py listen --timeout 60
```

This prints each incoming message as a JSON line until the timeout expires:

```
{"type": "message", "content": "Tell me a joke"}
{"type": "message", "content": "Actually, make it about cats"}
```

## Running as an agent bridge

The `agent` command creates a loop: it listens for user messages, forwards each one to `openclaw agent --agent main --message '<message>'`, captures the stdout, and sends it back to the user over the WebSocket.

```bash
uv run python $skill_dir/client.py agent
```

This runs indefinitely by default. Use `--timeout` to limit the session:

```bash
uv run python $skill_dir/client.py agent --timeout 300
```

The flow for each message:

1. User speaks -> server sends `{"type": "message", "content": "..."}` to the client
2. Client runs `openclaw agent --agent main --message '...'` and captures stdout
3. Client sends the agent's response back: `{"type": "message", "content": "<stdout>"}`

Logs are printed to stderr-style output as `[user]` and `[agent]` prefixed lines.

## Connection options

All commands accept `--url` to override the default WebSocket address:

```bash
uv run python $skill_dir/client.py --url ws://$host:$port/connect send "Hi"
```

Default URL: `ws://localhost:3111/connect`

## Message types reference

### Messages you send (agent -> user)

| Type      | Fields             | Description                       |
| --------- | ------------------ | --------------------------------- |
| `message` | `content` (string) | Text to speak/display to the user |

### Messages you receive (user -> agent)

| Type      | Fields             | Description                                             |
| --------- | ------------------ | ------------------------------------------------------- |
| `message` | `content` (string) | What the user said (transcribed text)                   |
| `echo`    | `content` (string) | Server confirmation of your sent message — ignore these |
| `pong`    |                    | Connection health check response — ignore these         |

## Behavior guidelines

- Respond promptly to every `message` you receive from the user.
- Keep responses conversational and concise — the user is speaking, not reading.
- Send one message at a time. Do not batch multiple sends.
- Ignore `echo` messages — they are confirmations, not user input.
- Use `recv` for turn-based conversation. Use `listen` when you expect the user to say multiple things.
