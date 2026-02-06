#!/usr/bin/env python3
"""Raw example: send a signed packet without the SDK (stdlib + protobuf + cryptography only).

This is useful for agents that cannot install packages or need to understand
the signing protocol at the byte level.
"""

import os
import socket
import struct
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from keep import keep_pb2

# 1. Generate ephemeral ed25519 keypair
private_key = Ed25519PrivateKey.generate()
pk_bytes = private_key.public_key().public_bytes_raw()

# 2. Build packet WITHOUT sig/pk
p = keep_pb2.Packet()
p.typ = 0           # ask
p.id = "raw-001"
p.src = "bot:raw-example"
p.dst = "server"
p.body = "hello from raw example"

# 3. Serialize unsigned packet = sign payload
sign_payload = p.SerializeToString()

# 4. Sign
sig_bytes = private_key.sign(sign_payload)

# 5. Set sig and pk, re-serialize
p.sig = sig_bytes
p.pk = pk_bytes
wire_data = p.SerializeToString()

# 6. Send over TCP with length-prefixed framing
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(10)
s.connect(("localhost", 9009))

# Frame: [4 bytes BE length][protobuf payload]
header = struct.pack(">I", len(wire_data))
s.sendall(header + wire_data)


# 7. Read framed reply
def recv_exact(sock, n):
    """Read exactly n bytes."""
    chunks = []
    while n > 0:
        chunk = sock.recv(min(n, 4096))
        if not chunk:
            raise ConnectionError("Connection closed unexpectedly")
        chunks.append(chunk)
        n -= len(chunk)
    return b"".join(chunks)


reply_header = recv_exact(s, 4)
(reply_len,) = struct.unpack(">I", reply_header)
reply_data = recv_exact(s, reply_len)
s.close()

resp = keep_pb2.Packet()
resp.ParseFromString(reply_data)
print(f"Reply: id={resp.id} body={resp.body}")
