---
name: cloudflare-dns-updater
description: "Creates or updates a proxied Cloudflare DNS A record. Use when you need to programmatically point a subdomain to an IP address. Takes record name, zone name, and IP address as input."
metadata:
  openclaw:
    requires:
      bins: ["python3"]
      python: ["requests"]
---

# Cloudflare DNS Updater

This skill creates or updates a Cloudflare DNS 'A' record, pointing it to a specified IP address and ensuring it is proxied. It is a foundational tool for automating service deployment and DNS management.

## Pre-requisites

This skill requires the `CLOUDFLARE_API_TOKEN` environment variable to be set with a valid Cloudflare API Token that has DNS edit permissions.

The model should verify this prerequisite before attempting to use the skill. If the variable is not set, it should inform the user and stop.

## Core Action: `scripts/update-record.py`

The core logic is handled by the `update-record.py` script.

### **Inputs (Command-Line Arguments)**

- `--zone`: (Required) The root domain name. Example: `example.com`
- `--record`: (Required) The name of the record (subdomain). Use `@` for the root domain itself. Example: `www`
- `--ip`: (Required) The IPv4 address to point the record to.
- `--proxied`: (Optional) Boolean (`true` or `false`) to set the Cloudflare proxy status. Defaults to `true`.

### **Output**

The script will print its progress to stdout.
- On success, it prints a confirmation message and a JSON object of the created/updated record.
- On failure, it prints a descriptive error message to stderr and exits with a non-zero status code.

### **Execution Workflow**

To use this skill, follow these steps:

1.  **Verify Prerequisites**: Check if the `CLOUDFLARE_API_TOKEN` environment variable is set. If not, notify the user and abort.
2.  **Gather Inputs**: From the user's request, identify the `zone`, `record` name, and target `ip`.
3.  **Construct Command**: Build the full shell command to execute the script.
4.  **Execute Command**: Run the command using the `exec` tool.
5.  **Report Result**:
    - If the command succeeds, report the successful creation or update to the user.
    - If the command fails, analyze the error message from stderr and report the issue to the user in a clear, understandable way.

### **Example Usage**

**User Request:** "Point www.example.com to the server's public IP."

**AI's Thought Process:**
1.  The user wants to update a DNS record on Cloudflare. The `cloudflare-dns-updater` skill is perfect for this.
2.  I will use the `update-record.py` script.
3.  I need the zone, record name, and IP.
    - Zone: `example.com`
    - Record: `www`
    - IP: I need to find the server's public IP first. I can use `curl -s https://ipv4.icanhazip.com/`.
4.  I will first get the IP, then construct the final command.
5.  I will execute the command and report the outcome.

**AI's Actions:**
```bash
# Step 1: Get IP
PUBLIC_IP=$(curl -s https://ipv4.icanhazip.com/)

# Step 2: Run the skill's script
python3 skills/cloudflare-dns-updater/scripts/update-record.py \
  --zone "example.com" \
  --record "www" \
  --ip "$PUBLIC_IP"
```

### **Failure Strategy**

- **If `CLOUDFLARE_API_TOKEN` is not set:** Do not attempt to run the script. Inform the user that the required environment variable is missing and needs to be configured by the administrator.
- **If the script exits with an error:** Read the error message from stderr. Common errors include invalid API token, incorrect zone name, or insufficient permissions. Report the specific error to the user.
