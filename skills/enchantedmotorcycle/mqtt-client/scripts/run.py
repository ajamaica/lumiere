#!/usr/bin/env python3
import os
import sys
import time
try:
    import paho.mqtt.client as mqtt
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--quiet', 'paho-mqtt'])
    import paho.mqtt.client as mqtt

BROKER = os.getenv('MQTT_BROKER', 'localhost')
PORT = int(os.getenv('MQTT_PORT', '1883'))
TOPIC = os.getenv('MQTT_TOPIC', '#')

client = mqtt.Client()

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    client.subscribe(TOPIC)

def on_message(client, userdata, msg):
    print(f"Received on {msg.topic}: {msg.payload.decode()} ")

client.on_connect = on_connect
client.on_message = on_message

client.connect(BROKER, PORT, 60)
client.loop_start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    pass
finally:
    client.loop_stop()
    client.disconnect()
