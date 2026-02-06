#!/bin/bash
# vm-control.sh - Wrapper for common ESXi VM operations

ESXI_USER="${ESXI_USER:-root}"
ESXI_HOST="${1:-}"
ACTION="${2:-}"
VMNAME="${3:-}"

usage() {
    echo "Usage: ESXI_USER=<user> $0 <esxi-host> <action> [vm-name-or-id]"
    echo "Environment: ESXI_USER (default: root)"
    echo "Actions: list, start, stop, reboot, status, snapshots"
    exit 1
}

[[ -z "$ESXI_HOST" || -z "$ACTION" ]] && usage

case "$ACTION" in
    list)
        ssh "${ESXI_USER}@${ESXI_HOST}" "vim-cmd vmsvc/getallvms"
        ;;
    status)
        [[ -z "$VMNAME" ]] && { echo "VM ID required"; exit 1; }
        ssh "${ESXI_USER}@${ESXI_HOST}" "vim-cmd vmsvc/power.getstate $VMNAME"
        ;;
    start)
        [[ -z "$VMNAME" ]] && { echo "VM ID required"; exit 1; }
        ssh "${ESXI_USER}@${ESXI_HOST}" "vim-cmd vmsvc/power.on $VMNAME"
        ;;
    stop)
        [[ -z "$VMNAME" ]] && { echo "VM ID required"; exit 1; }
        ssh "${ESXI_USER}@${ESXI_HOST}" "vim-cmd vmsvc/power.shutdown $VMNAME"
        ;;
    reboot)
        [[ -z "$VMNAME" ]] && { echo "VM ID required"; exit 1; }
        ssh "${ESXI_USER}@${ESXI_HOST}" "vim-cmd vmsvc/power.reboot $VMNAME"
        ;;
    snapshots)
        [[ -z "$VMNAME" ]] && { echo "VM ID required"; exit 1; }
        ssh "${ESXI_USER}@${ESXI_HOST}" "vim-cmd vmsvc/snapshot.get $VMNAME"
        ;;
    *)
        echo "Unknown action: $ACTION"
        usage
        ;;
esac
