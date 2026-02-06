#!/bin/bash
# Quick Hue setup - run this AFTER pressing the bridge button
curl -X POST http://192.168.1.151/api -d '{"devicetype":"clawdbot#hue"}'