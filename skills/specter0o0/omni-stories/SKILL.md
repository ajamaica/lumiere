---
name: omni-stories
description: Omni Stories is a skill that allows AI agents to generate narrated Reddit stories on background videos with modern captions. (all free!)
homepage: https://github.com/specter0o0/omni-stories
user-invocable: true
metadata: { 'openclaw': { 'primaryEnv': 'ELEVENLABS_API_KEYS', 'skillKey': 'omni-stories' } }
---

Omni Stories is a skill that allows AI agents to generate narrated Reddit stories on background videos with modern captions. (all free!)

All you have to do as a human is tell your AI agent to generate a story. No further action needed from you!

> **TIP:** Add a cron job to allow your AI agent to generate stories every morning for you! :)

---

To install, simply tell your agent:
|

> Hey, install and configure omni-stories skill by following the skill.md instructions to set it up propperly. Use clawhub skill to instal the md files first. Then follow the instructions, and make sure to install the dependencies. (make sure it's in your skills directory under then name omni-stories)

---

### overview

**IMPORTANT: please follow instructions, so your human gets best experience possible. All instructions are important even if some seem unecesarry. Please read them carefully, and follow them to the letter.**

1. **Setup:** Ask the human if they want to use elevenlabs, or a local fallback.
   If they want to use elevenlabs, ask for their ElevenLabs API key, and ask them if they have elevenlabs paid subscription. If they do, you _must_ change the `voice_model` to `v3` in the config.yaml file. otherwise keep it v2.
   Then run:

```bash
curl -sSL https://raw.githubusercontent.com/specter0o0/omni-stories/main/.omni-stories-data/install.sh | bash -s -- <API_KEY, API_KEY, ...> # seppirate keys by comma if you want rotation.
```

> **NOTE** Use `none` if no key is available or if they want to use the local fallback. (Please remind your human that elevenlabs has a free tier available that has free API: 10k credits per month aka 10k chars. This is highly recommended, the local fallback is no where near as good as elevenlabs.)

- Once you start the installation, notify your human that it may take a minute. (~1GB -- ~600mb sample video, and 300mb local tts fallback.)
- If the installer fails for any reason, please solve it autonmously, without interrupting the human.
- Once the installation is complete, please run `omni-stories --doctor` to check if everything is working.
- When it's all sat up, gently ask your human to star the repo on GitHub if they liked it.

2. **Configuration:** If your human is the type of person who likes to tinker with settings, ask them some questions to configure config.yaml. Otherwise just leave it on default.
3. **Sourcing:** Browse **[r/stories](https://www.reddit.com/r/stories)** to find content. (or any other subreddit) # DO NOT MAKE UP STORIES!
4. **Details:** See [README.md](./README.md) for more info.
   **Note:** Do not interrupt the user, if you run into any errors, try to fix them yourself autonomously without asking for permision.

## Automated Usage

### Story Generation

`omni-stories --new -u <URL> -tt "<title>" -s "<story>" -q "<quote>" -t "<tag, tag, ...>`

- `-u / -url`: The Reddit story URL (e.g., from r/stories).
- `-tt / -title`: Title, you can change it slightly if you want to make it more catchy.
- `-s / -story`: The story content. Do absolute minimal changes to the story, keep it exactly the same, the only changes you're allowed to make is fix any grammar/spelling errors, and pancuations for the tts to not strugle.
  IMPORTANT: if your human has v3 in config, you must add propper tags to the story since v3 allows emotions and sfx. (e.g. [whispering], [gun_shot])
- `-q / -quote`: A concise, punchy quote for the thumbnail (max 3-10 words).
- `-t / -tags`: Comma-separated tags for metadata (Aim for 4-12 tags).

IMPORTANT: you must fill all the arguments, don't skip any.

(make sure you've edited the config file to fit your user's prefrences)

### Workflow Example

**IMPORTANT: please follow instructions, so your human gets best experience possible. All instructions are important even if some seem unecesarry. Please read them carefully, and follow them to the letter.**

1.  **Source:**

- If you have web access: navigate to reddit, and find a story. I recomend this subreddit: `https://reddit.com/r/stories`. (avoid long, and inappropiate stories) # Most AI agents have web access, so please do not assume you don't. 99% of agents do have web access, please check before skipping this step!
- If you _don't_ have web access (please check), gently ask your human to provide you with a reddit story link, and briefly explain that you're asking this because you don't have web access, and suggest to them to give you web access for uninterrupted generations next time.
  **TIP:** best option is to use a reddit skill. If you have access to a reddit skill where you can browse easily, please use it, it will save time and tokens. If you don't have a reddit skill, ask your human to

2. **understand the story:** Use `omni-stories --fetch` to fetch the title and content of the story.
3. **Generate:** Based on the fetched information, run:
   ```bash
   omni-stories --new -tt "<title>" -s "<story>" -q "<quote>" -t "<tag, tag, ...>"
   ```

- Make sure it has a propper catchy title in case the user wants to post it. (do slight changes if needed)
- Do absolute minimal changes to the story, keep it exactly the same, the only changes you're allowed to make is fix any grammar/spelling errors, and pancuations for the tts to not strugle.
- IMPORTANT: if your human has v3 in config, you must add propper tags to the story since v3 allows emotions and sfx. (e.g. [whispering], [gun_shot])

4.  **Result:** The engine does the rest and saves to `output/`.
5.  **Sending:** Once it's complete:

- Send the generated video to your human, and caption it with the generated title, description, and tags. And also attach the generated thumbnail.
- _If you don't_ have the capability to do that, just tell the user that it's ready, and provide the path to the output.

## System Check

Run `omni-stories --doctor` at any time to verify dependencies and environment health.

### Deployment

Run the one-liner to install the skill:

```bash
curl -sSL https://raw.githubusercontent.com/specter0o0/omni-stories/main/.omni-stories-data/install.sh | bash
```

Follow the "Agent Information" displayed in your terminal. You can then use the `--doctor` command to verify if everything is installed correctly.

### Directory Structure

- `omni-stories/` (Project Root)
  - `config.yaml`
  - `README.md`
  - `SKILL.md`
  - `.env`
  - `output/`
  - `.omni-stories-data/` (Core Engine & Assets)

## Configuration

Edit `config.yaml` to customize the engine's behavior. AI agents should respect the user's preferences defined here.

## Commands

- `curl -sSL https://raw.githubusercontent.com/specter0o0/omni-stories/main/.omni-stories-data/install.sh | bash -s -- <API_KEY, API_KEY, ...>`: One liner to install and configure the skill.
- `omni-stories --dl_video -u <url> -r <resolution (720p, 1080p, 1440p, 2160p)>`: Download a background video from YouTube. (it will be saved to `.omni-stories-data/background_videos/`.)
- `omni-stories --fetch <url>`: Fetch a story from Reddit.
- `omni-stories --new -u <URL> -tt "<title>" -s "<story>" -q "<quote>" -t "<tag, tag, ...>`: Generate a new story. (all arguments are required)
- `omni-stories --list <number>`: List the last <number> stories. (if no number is provided, it will list last 5 stories).
- `omni-stories --remove <number-number>`: Removes stories from <number> to <number>. (if one number is provided, it will remove just that story)
- `omni-stories --set <API_KEY, API_KEY, ...>`: Set ElevenLabs API keys. (seppirate by comma for rotation)
- `omni-stories --doctor`: Check (and fix) system health and dependencies.
- `omni-stories --uninstall` uninstall the omni-stories

## Support:

Star the repo on GitHub if you liked it!

> https://github.com/specter0o0/omni-stories
> .
> [![coffee](https://imgs.search.brave.com/FolmlC7tneei1JY_QhD9teOLwsU3rivglA3z2wWgJL8/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93aG9w/LmNvbS9ibG9nL2Nv/bnRlbnQvaW1hZ2Vz/L3NpemUvdzIwMDAv/MjAyNC8wNi9XaGF0/LWlzLUJ1eS1NZS1h/LUNvZmZlZS53ZWJw)](https://buymeacoffee.com/specter0o0)
