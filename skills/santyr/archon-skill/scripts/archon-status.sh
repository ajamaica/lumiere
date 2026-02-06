#!/bin/bash
# Fetch full Archon node status (JSON)

curl -s "https://archon.technology/api/v1/status" | jq '.'
