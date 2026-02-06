#!/usr/bin/env python3
"""Routing demo: two agents communicate through the keep server.

Run with the server already listening on localhost:9009:
    go build -o keep . && ./keep

Then:
    python3 examples/routing_basic.py

Agent A ("bot:alice") listens for messages.
Agent B ("bot:bob") sends a message to "bot:alice" through the server.
Alice's callback prints the received packet.
"""

import threading
import time

from keep.client import KeepClient


def main():
    received = []

    def on_message(packet):
        print(f"[Alice] Received from {packet.src}: {packet.body}")
        received.append(packet)

    # Agent A: Alice — connects and listens for routed messages
    alice = KeepClient(src="bot:alice")
    alice.connect()
    # Send an initial packet to register identity with the server
    alice.send(body="hello", dst="server", wait_reply=True)
    print("[Alice] Registered with server")

    # Start listening in a background thread
    listener = threading.Thread(
        target=alice.listen, args=(on_message, 5.0), daemon=True
    )
    listener.start()

    # Give listener a moment to start
    time.sleep(0.2)

    # Agent B: Bob — sends a message to Alice through the server
    with KeepClient(src="bot:bob") as bob:
        # Register Bob's identity first
        bob.send(body="hi", dst="server", wait_reply=True)
        print("[Bob] Registered with server")

        # Send to Alice (fire-and-forget in persistent mode)
        bob.send(body="Hey Alice, want to coordinate?", dst="bot:alice")
        print("[Bob] Sent message to bot:alice")

    # Wait for listener to finish (timeout=5s)
    listener.join()
    alice.disconnect()

    if received:
        print(f"\nRouting works! Alice received {len(received)} message(s).")
    else:
        print("\nNo messages received. Check that the server is running.")


if __name__ == "__main__":
    main()
