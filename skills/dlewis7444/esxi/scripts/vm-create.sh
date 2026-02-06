#!/bin/bash
# vm-create.sh - Create a new VM on ESXi by building VMX manually
# Compatible with ESXi 6.x through 8.x

set -euo pipefail

ESXI_USER="${ESXI_USER:-root}"
ESXI_HOST="${1:-}"
VM_NAME="${2:-}"
DATASTORE="${3:-}"

CPUS="${4:-1}"
MEMORY_MB="${5:-1024}"
DISK_GB="${6:-16}"
GUEST_OS="${7:-otherLinux64Guest}"
NETWORK="${8:-VM Network}"
ISO_PATH="${9:-}"

usage() {
    cat << EOF
Usage: ESXI_USER=<user> ./vm-create.sh <esxi-host> <vm-name> <datastore> [cpus] [memory_mb] [disk_gb] [guest_os] [network] [iso_path]

Required:
  esxi-host     ESXi hostname or IP
  vm-name       Name for the new VM
  datastore     Datastore name or UUID

Optional:
  cpus          Number of CPUs (default: 1)
  memory_mb     Memory in MB (default: 1024)
  disk_gb       Disk size in GB (default: 16)
  guest_os      Guest OS identifier (default: otherLinux64Guest)
  network       Port group name (default: "VM Network")
  iso_path      Full ISO path on datastore (e.g., "[datastore] ISOs/linux.iso")

Environment:
  ESXI_USER     SSH username (default: root)

Guest OS examples:
  rockylinux-64, rhel9-64, centos8-64, ubuntu-64
  otherLinux64Guest (fallback)

Example:
  ESXI_USER=admin ./vm-create.sh esxi-host myvm "datastore1" 2 4096 50 rockylinux-64 "VM Network" "[datastore1] ISOs/rocky.iso"
EOF
    exit 1
}

[[ -z "$ESXI_HOST" || -z "$VM_NAME" || -z "$DATASTORE" ]] && usage

SSH_CMD="ssh ${ESXI_USER}@${ESXI_HOST}"
VM_DIR="/vmfs/volumes/${DATASTORE}/${VM_NAME}"
VMX_PATH="${VM_DIR}/${VM_NAME}.vmx"

echo "=== Creating VM: $VM_NAME on $ESXI_HOST ==="

# Check if exists
if $SSH_CMD "test -d ${VM_DIR}" 2>/dev/null; then
    echo "ERROR: VM directory already exists: ${VM_DIR}"
    exit 1
fi

# Create VM directory
echo "Creating VM directory..."
$SSH_CMD "mkdir -p ${VM_DIR}"

# Create VMDK
echo "Creating ${DISK_GB}GB virtual disk..."
$SSH_CMD "vmkfstools -c ${DISK_GB}G ${VM_DIR}/${VM_NAME}.vmdk"

# Build VMX with pciBridge support (required for ESXi 6.x-8.x PCIe devices)
echo "Creating VMX configuration..."
VMX_CONTENT=".encoding = \"UTF-8\"
config.version = \"8\"
virtualHW.version = \"17\"
virtualHW.productCompatibility = \"hosted\"
vmci0.present = \"TRUE\"
floppy0.present = \"FALSE\"
firmware = \"efi\"
memSize = \"${MEMORY_MB}\"
numvcpus = \"${CPUS}\"
scsi0.virtualDev = \"pvscsi\"
scsi0.present = \"TRUE\"
sata0.present = \"TRUE\"
scsi0:0.deviceType = \"scsi-hardDisk\"
scsi0:0.fileName = \"${VM_NAME}.vmdk\"
scsi0:0.present = \"TRUE\"
ethernet0.virtualDev = \"vmxnet3\"
ethernet0.networkName = \"${NETWORK}\"
ethernet0.addressType = \"generated\"
ethernet0.wakeOnPcktRcv = \"FALSE\"
ethernet0.uptCompatibility = \"TRUE\"
ethernet0.present = \"TRUE\"
displayName = \"${VM_NAME}\"
guestOS = \"${GUEST_OS}\"
uefi.secureBoot.enabled = \"TRUE\"
pciBridge0.present = \"TRUE\"
pciBridge4.present = \"TRUE\"
pciBridge4.virtualDev = \"pcieRootPort\"
pciBridge4.functions = \"8\"
pciBridge5.present = \"TRUE\"
pciBridge5.virtualDev = \"pcieRootPort\"
pciBridge5.functions = \"8\"
pciBridge6.present = \"TRUE\"
pciBridge6.virtualDev = \"pcieRootPort\"
pciBridge6.functions = \"8\"
pciBridge7.present = \"TRUE\"
pciBridge7.virtualDev = \"pcieRootPort\"
pciBridge7.functions = \"8\"
svga.present = \"TRUE\"
usb_xhci.present = \"TRUE\"
"

if [ -n "$ISO_PATH" ]; then
    VMX_CONTENT+="sata0:0.deviceType = \"cdrom-image\"
sata0:0.fileName = \"${ISO_PATH}\"
sata0:0.present = \"TRUE\"
sata0:0.startConnected = \"TRUE\"
"
fi

# Write VMX
echo "$VMX_CONTENT" | $SSH_CMD "cat > ${VMX_PATH}"

# Register VM
echo "Registering VM..."
VMID=$($SSH_CMD "vim-cmd solo/registervm ${VMX_PATH}")

echo ""
echo "=========================================="
echo "VM '${VM_NAME}' created successfully!"
echo "VM ID: ${VMID}"
echo "CPUs: ${CPUS}, Memory: ${MEMORY_MB}MB, Disk: ${DISK_GB}GB"
echo "Guest OS: ${GUEST_OS}"
echo "Network: ${NETWORK}"
[ -n "$ISO_PATH" ] && echo "ISO: ${ISO_PATH}"
echo ""
echo "Next steps:"
echo "1. Verify VM: ./vm-control.sh ${ESXI_HOST} status ${VMID}"
echo "2. Power on:  ./vm-control.sh ${ESXI_HOST} start ${VMID}"
echo "=========================================="
