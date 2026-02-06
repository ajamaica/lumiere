#!/bin/bash
# Quick Ubuntu microVM
SOCK_DIR=\"/tmp/firecracker-$(date +%s)\"
mkdir -p $SOCK_DIR
cd /home/admin/.openclaw/workspace/firecracker
./firecracker --api-sock $SOCK_DIR/sock &
sleep 1
curl --unix-socket $SOCK_DIR/sock -i \\
  -X PUT 'http://localhost/boot-sources' \\
  -H 'Accept: application/json' -H 'Content-Type: application/json' \\
  -d '{\"kernel_image_path\": \"./vmlinux.bin\", \"boot_args\": \"console=ttyS0 reboot=k panic=1 pci=off\"}'
# Add mem/drive/net, then POST /actions/boot-vms
echo $SOCK_DIR # Use for control