#!/bin/bash
# Download latest Firecracker for arm64 (RPi)
set -e
DIR=\"$(dirname \"$0\")/../..\"
cd \"$DIR/firecracker\" || mkdir -p firecracker && cd firecracker
VERSION=$(curl -s https://api.github.com/repos/firecracker-microvm/firecracker/releases/latest | grep tag_name | cut -d '\"' -f4 | sed 's/v//')
ARCH=aarch64
echo \"Downloading Firecracker v$VERSION...\"
curl -L \"https://github.com/firecracker-microvm/firecracker/releases/download/v$VERSION/firecracker-$VERSION-$ARCH.tgz\" | tar xz
curl -L \"https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/ubuntu_22.04/firecracker-container-rootfs-ubuntu-22.04lts.tar.gz\" | tar xz -C rootfs --strip-components=1 || mkdir rootfs && tar xz -C rootfs
curl -L \"https://s3.amazonaws.com/spec.ccfc.min/kernel/v1.0.4/vmlinux.bin\" -o vmlinux.bin || curl -L \"https://github.com/firecracker-microvm/firecracker/releases/download/v$VERSION/vmlinux.bin\" -o vmlinux.bin
chmod +x firecracker
echo \"Setup complete: ./firecracker --version\"
ls -la