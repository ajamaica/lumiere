# Firecracker API

PUT /boot-sources: kernel/boot args
PUT /machine-config: vcpu/mem
PUT /drives/rootfs: path/read-only
PUT /network-interfaces: tap/host_dev
POST /actions/boot-vms
GET /vm/information
See full: https://github.com/firecracker-microvm/firecracker/blob/main/docs/api_requests.md
