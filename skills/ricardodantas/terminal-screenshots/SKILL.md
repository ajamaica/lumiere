# Terminal Screenshots & Recordings with VHS

Generate terminal screenshots and animated GIFs/videos using [VHS](https://github.com/charmbracelet/vhs) from Charmbracelet.

## When to Use This Skill

- Creating terminal screenshots for documentation
- Recording animated GIFs of CLI demos
- Generating video tutorials for command-line tools
- Producing consistent, reproducible terminal visuals
- Integration testing with golden file comparisons

## Prerequisites

### Check Installation

```bash
# Check if vhs is installed
which vhs && vhs --version

# Check dependencies
which ttyd && which ffmpeg
```

### Installation

**Recommended: Homebrew (macOS/Linux)**

```bash
brew install vhs
```

This installs VHS with all required dependencies (ttyd, ffmpeg).

**Other methods:**

```bash
# Fedora/RHEL
echo '[charm]
name=Charm
baseurl=https://repo.charm.sh/yum/
enabled=1
gpgcheck=1
gpgkey=https://repo.charm.sh/yum/gpg.key' | sudo tee /etc/yum.repos.d/charm.repo
sudo dnf install vhs ffmpeg
# Also install ttyd: https://github.com/tsl0922/ttyd/releases

# Arch Linux
pacman -S vhs

# Docker (includes all dependencies)
docker run --rm -v $PWD:/vhs ghcr.io/charmbracelet/vhs <cassette>.tape
```

## Basic Usage

### 1. Create a Tape File

```bash
vhs new demo.tape
```

### 2. Edit the Tape File

Tape files are simple scripts that describe what to type and capture.

### 3. Run VHS

```bash
vhs demo.tape
```

## Tape File Syntax

### Output Formats

```tape
Output demo.gif          # Animated GIF
Output demo.mp4          # Video file
Output demo.webm         # WebM video
Output frames/           # PNG sequence (directory)
```

You can specify multiple outputs in one tape file.

### Settings (Must Be at Top)

```tape
# Terminal dimensions
Set Width 1200
Set Height 600

# Font settings
Set FontSize 22
Set FontFamily "JetBrains Mono"

# Appearance
Set Theme "Catppuccin Mocha"
Set Padding 20
Set Margin 20
Set MarginFill "#1e1e2e"
Set BorderRadius 10
Set WindowBar Colorful

# Behavior
Set Shell "bash"
Set TypingSpeed 50ms
Set Framerate 30
Set CursorBlink false
```

### Common Themes

Run `vhs themes` to see all available themes. Popular ones:

- `Catppuccin Mocha`, `Catppuccin Frappe`
- `Dracula`
- `Tokyo Night`
- `Nord`
- `One Dark`

### Commands

| Command               | Description              | Example                  |
| --------------------- | ------------------------ | ------------------------ |
| `Type "text"`         | Type characters          | `Type "echo hello"`      |
| `Type@500ms "text"`   | Type slowly              | `Type@500ms "important"` |
| `Enter`               | Press Enter              | `Enter`                  |
| `Enter 2`             | Press Enter twice        | `Enter 2`                |
| `Sleep 1s`            | Wait duration            | `Sleep 500ms`            |
| `Backspace`           | Delete character         | `Backspace 5`            |
| `Tab`                 | Press Tab                | `Tab`                    |
| `Space`               | Press Space              | `Space`                  |
| `Ctrl+C`              | Control sequences        | `Ctrl+L`                 |
| `Up/Down/Left/Right`  | Arrow keys               | `Up 3`                   |
| `Hide`                | Stop recording frames    | `Hide`                   |
| `Show`                | Resume recording         | `Show`                   |
| `Screenshot file.png` | Capture current frame    | `Screenshot out.png`     |
| `Wait /regex/`        | Wait for text to appear  | `Wait /\$\s*$/`          |
| `Env KEY "value"`     | Set environment variable | `Env PS1 "$ "`           |
| `Require program`     | Fail if program missing  | `Require git`            |
| `Source file.tape`    | Include another tape     | `Source setup.tape`      |

### Escaping Quotes

Use backticks to escape quotes:

```tape
Type `echo "hello world"`
Type `VAR='value'`
```

## Examples

### Static Screenshot

```tape
Output screenshot.png

Set Width 800
Set Height 400
Set FontSize 18
Set Theme "Catppuccin Mocha"
Set Padding 20

# Hide setup
Hide
Type "clear"
Enter
Show

# The actual content
Type "ls -la"
Enter
Sleep 500ms

Screenshot screenshot.png
```

### Animated Demo GIF

```tape
Output demo.gif

Set Width 1000
Set Height 500
Set FontSize 20
Set Theme "Dracula"
Set TypingSpeed 50ms
Set Padding 20
Set WindowBar Colorful

# Clean start
Hide
Type "clear"
Enter
Show

# Demo sequence
Type "echo 'Hello from VHS!'"
Sleep 300ms
Enter
Sleep 1s

Type "date"
Enter
Sleep 1s

Type "echo 'That was easy!'"
Enter
Sleep 2s
```

### MP4 Video with Clean Prompt

```tape
Output tutorial.mp4

Set Width 1200
Set Height 600
Set FontSize 24
Set Theme "Tokyo Night"
Set Shell "bash"
Set Framerate 30

# Set a clean, minimal prompt
Hide
Env PS1 "$ "
Type "clear"
Enter
Show

Type "# Welcome to the tutorial"
Enter
Sleep 1s

Type "git status"
Enter
Sleep 2s

Type "git log --oneline -5"
Enter
Sleep 3s
```

## Tips for Clean Output

### 1. Hide Setup/Cleanup

```tape
# Setup (hidden)
Hide
Type "cd ~/project && clear"
Enter
Show

# Your demo here...

# Cleanup (hidden)
Hide
Type "cd - && rm temp-files"
Enter
```

### 2. Use a Simple Prompt

```tape
Hide
Env PS1 "$ "
Type "clear"
Enter
Show
```

### 3. Control Timing

- Use `Sleep` liberally for readability
- `Sleep 500ms` after typing, before Enter
- `Sleep 1s` to `2s` after command output
- End with `Sleep 2s` or more for the final frame

### 4. Typing Speed

```tape
# Default speed for setup
Set TypingSpeed 10ms

# Slow down for important parts
Type@100ms "Important command here"
```

### 5. Wait for Output

```tape
Type "npm install"
Enter
Wait /added \d+ packages/  # Wait for completion message
Sleep 1s
```

### 6. Screenshot at Key Moments

```tape
Type "make build"
Enter
Wait /Build complete/
Screenshot build-success.png
```

## Workflow for Documentation

1. **Plan** your demo sequence
2. **Create** a `.tape` file with settings
3. **Test** with `vhs demo.tape` (generates output)
4. **Iterate** - adjust timing, dimensions, theme
5. **Commit** both the `.tape` file and output to your repo

## Recording Real Sessions

You can record your terminal and generate a tape file:

```bash
vhs record > session.tape
```

Then edit the generated tape file to clean it up.

## File Reference

See example tape files in this skill directory:

- `basic-screenshot.tape` - Simple static screenshot
- `demo-recording.tape` - Animated GIF demo

## Resources

- [VHS GitHub](https://github.com/charmbracelet/vhs)
- [VHS Themes](https://github.com/charmbracelet/vhs/blob/main/THEMES.md)
- [Example Tapes](https://github.com/charmbracelet/vhs/tree/main/examples)
