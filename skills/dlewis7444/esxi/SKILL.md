---
name: esxi
description: Manage VMware ESXi hosts and virtual machines via SSH and vim-cmd. Use when interacting with ESXi infrastructure for VM operations (list, start, stop, snapshot), host monitoring, resource checking, or troubleshooting ESXi servers.
---

# ESXi Management

## Overview

Interact with VMware ESXi hypervisors using native tools (vim-cmd, esxcli) over SSH. This skill provides workflows for VM lifecycle management, host monitoring, and common ESXi operations.

## Connection Requirements

- SSH access to ESXi host (privileged account - typically root for vim-cmd)
- Hostname/IP and credentials configured for passwordless SSH or key auth
- vim-cmd and esxcli available on target host

## Environment Variables

| Variable    | Default | Description                |
| ----------- | ------- | -------------------------- |
| `ESXI_USER` | `root`  | SSH username for ESXi host |

Override example:

```bash
ESXI_USER=admin ./vm-control.sh esxi-host list
```

## Core Operations

### VM Management

**List all VMs:**

```bash
ssh root@esxi-host "vim-cmd vmsvc/getallvms"
```

**Get VM power state:**

```bash
ssh root@esxi-host "vim-cmd vmsvc/power.getstate <vmid>"
```

**Power operations:**

```bash
# Start VM
ssh root@esxi-host "vim-cmd vmsvc/power.on <vmid>"

# Stop VM (graceful shutdown)
ssh root@esxi-host "vim-cmd vmsvc/power.shutdown <vmid>"

# Force power off
ssh root@esxi-host "vim-cmd vmsvc/power.off <vmid>"

# Reboot VM
ssh root@esxi-host "vim-cmd vmsvc/power.reboot <vmid>"
```

### Snapshot Management

**List snapshots:**

```bash
ssh root@esxi-host "vim-cmd vmsvc/snapshot.get <vmid>"
```

**Create snapshot:**

```bash
ssh root@esxi-host "vim-cmd vmsvc/snapshot.create <vmid> <snapshot-name>"
```

**Revert to snapshot:**

```bash
ssh root@esxi-host "vim-cmd vmsvc/snapshot.revert <vmid> <snapshot-id>"
```

**Remove snapshot:**

```bash
ssh root@esxi-host "vim-cmd vmsvc/snapshot.remove <vmid> <snapshot-id>"
```

### Host Information

**System info:**

```bash
ssh root@esxi-host "esxcli system version get"
ssh root@esxi-host "esxcli system hostname get"
```

**Uptime and health:**

```bash
ssh root@esxi-host "uptime"
ssh root@esxi-host "esxcli hardware platform get"
```

**Storage info:**

```bash
ssh root@esxi-host "esxcli storage filesystem list"
ssh root@esxi-host "esxcli storage core device list"
```

**Network info:**

```bash
ssh root@esxi-host "esxcli network ip interface ipv4 get"
ssh root@esxi-host "esxcli network vswitch standard list"
```

### Resource Monitoring

**CPU/Memory usage:**

```bash
ssh root@esxi-host "esxcli hardware memory get"
ssh root@esxi-host "esxtop -b -n 1 | head"
```

**Running processes:**

```bash
ssh root@esxi-host "esxcli system process list"
```

## VM Creation

Create new VMs using `vm-create.sh` which builds VMX files directly and registers them with `vim-cmd solo/registervm`.

### Quick Start

```bash
# Basic VM (1 CPU, 1GB RAM, 16GB disk)
./vm-create.sh esxi-host myvm "datastore1"

# Custom specs (2 CPUs, 4GB RAM, 50GB disk, Rocky Linux)
./vm-create.sh esxi-host myvm "datastore1" 2 4096 50 rockylinux-64 "VM Network" "[datastore1] ISOs/rocky.iso"
```

### How It Works

The script creates VMs by:

1. Creating the VM directory on the datastore
2. Creating a virtual disk with `vmkfstools`
3. Building a VMX configuration file with proper PCI bridge support
4. Registering the VM with `vim-cmd solo/registervm`

### Safety Features

- **Duplicate check**: Exits if VM name already exists
- **Proper PCI config**: Includes pciBridge entries required for ESXi 6.x-8.x
- **EFI boot**: Uses UEFI with secure boot enabled
- **Manual power-on**: Does not start automatically (verification step)

### Guest OS Identifiers

Format varies by ESXi version. Common values:

- `rockylinux-64` - Rocky Linux 8/9 (ESXi 7.0+)
- `rhel9-64` - RHEL 9
- `centos8-64` - CentOS 8
- `ubuntu-64` - Ubuntu
- `otherLinux64Guest` - Generic Linux (universal fallback)

Note: ESXi 8.x may show `rockylinux_64Guest` in some docs but accepts `rockylinux-64`.

### Post-Creation Steps

1. Verify VM was created: `./vm-control.sh esxi-host list`
2. Configure kickstart/network settings if needed
3. Power on: `./vm-control.sh esxi-host start <vmid>`
4. Monitor via ESXi console

## Troubleshooting

### SSH Key Authentication

If SSH connections fail with permission denied or password prompts, the ESXi host may need the SSH public key configured.

**On the ESXi host, add the public key:**

```bash
esxcli system ssh key add -u <username> -k "<public-key-contents>"
```

**On the local client, ensure ~/.ssh/config includes a Host entry that matches your connection string:**

```
Host esxi-host
    HostName <esxi-ip-or-hostname>
    User <username>
    IdentityFile ~/.ssh/id_rsa
```

Note: SSH config `Host` entries are matched literally. If you connect with the short hostname, your config must use the short hostname. If you use the FQDN, your config must match the FQDN.

## Resources

### scripts/

- `vm-control.sh` - Wrapper for common VM operations (supports ESXI_USER env var)
- `vm-create.sh` - Create new VMs with proper PCI bridge config (supports ESXI_USER env var)
- `host-info.sh` - Gather host statistics and health (supports ESXI_USER env var)
