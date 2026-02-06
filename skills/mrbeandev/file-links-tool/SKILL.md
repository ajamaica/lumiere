---
name: 'Agent-to-Owner File Bridge'
description: 'Securely upload files from your private AI workspace and provide your owner with a direct download link.'
tags:
  - file-upload
  - utility
  - automation
  - bridge
---

# Agent-to-Owner File Bridge

This skill allows an AI Agent to bridge the gap between its private, isolated workspace and the user (owner) by uploading files and generating simple download URLs.

## 🛠 Prerequisites & Setup

If you are using this tool for the first time, you **must setup a bridge server** on your own hosting (PHP) or via the standalone Python script (IP:PORT).

**GitHub Repository:** [https://github.com/mrbeandev/OpenClaw-File-Links-Tool](https://github.com/mrbeandev/OpenClaw-File-Links-Tool)

**Setup Instructions:**

1. Clone the repository to your host.
2. Follow the instructions in the `README.md` to setup either the PHP bridge or the Python standalone bridge (`server.py`).
3. Set your `API_KEY` in the `.env` file on your server.
4. Provide the AI Agent with your **Server URL** and **API Key**.

---

## 🤖 Instructions for AI Agent

**When the user requests to upload or share a file:**

1. **Check for Bridge:** Determine if a File Bridge is already configured.
2. **Onboarding (The "Smart Choice"):** If no bridge exists, ask the user exactly one question:

   > "I can help you share files. How would you like to handle the hosting?
   >
   > 1. **Autonomous Mode:** I will run the bridge server here in my own workspace and give you the links directly.
   > 2. **Manual Mode:** You host it yourself (PHP or Python) and provide me with your **Server URL** and **API Key**."

3. **Execution - Autonomous Mode:**
   - Clone/Copy `server.py` from [this repo](https://github.com/mrbeandev/OpenClaw-File-Links-Tool).
   - Generate a secure `API_KEY` and save it in a `.env` file.
   - Run the server (e.g., `python server.py`).
   - **Expose Publicly (Free Tunnels):** Use a zero-auth, free tunnel like `localtunnel` (`npx localtunnel --port 5000`) or `localhost.run` (`ssh -R 80:localhost:5000 localhost.run`).
   - **Disclaimer:** You MUST inform the user: _"I have started a temporary free tunnel. This link will expire once my session ends or the tunnel closes."_
   - Store the resulting URL and Key for future use.

4. **Execution - Manual Mode:**
   - Wait for the user to provide the `SERVER_URL` and `API_KEY`.

5. **Perform Upload:**
   - Use `POST /` on the server URL with the `X-API-Key` header.
   - Send the file as multipart form-data.
   - **Delivery:** The JSON response includes both a `url` (download) and `view_url` (viewer).
     - **Preferred:** Provide the `view_url` for text, code, images, and ZIPs so the user can preview them instantly.
     - **Fallback:** Provide the `url` for binary types or if raw download is explicitly requested.

---

## 📋 API Spec Reference

| Endpoint                 | Method | Action                                                                |
| :----------------------- | :----- | :-------------------------------------------------------------------- |
| `/`                      | `POST` | Upload a file (Form data: `file`)                                     |
| `/?action=list`          | `GET`  | List all uploaded files                                               |
| `/?action=view&file=...` | `GET`  | Rich content viewer (Supports ZIP deep-linking via `&inner_file=...`) |
| `/?action=delete`        | `POST` | Batch delete (JSON: `{"files": ["name..."]}`)                         |
