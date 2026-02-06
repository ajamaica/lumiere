import asyncio
import struct
import sys
import time

from sphero_constants import *
from bleak import BleakClient

class SpheroMini:
    def __init__(self, address):
        self.sequence = 0
        self.address = address
        self.notificationPacket = []   
        self.clear_notification()

    async def connect(self):
        self.client = BleakClient(self.address)
        await self.client.connect(timeout=15.0)  # Increased timeout
        print("Connected: {0}".format(self.client.is_connected))

        # cancel if not connected
        if not self.client.is_connected:
            return False
        
        # get device name
        try:
            DEVICE_NAME_UUID = "00002A00-0000-1000-8000-00805f9b34fb"
            device_name = await self.client.read_gatt_char(DEVICE_NAME_UUID)
            print("Device Name: {0}".format("".join(map(chr, device_name))))
        except Exception:
            pass

        self.API_V2_characteristic = "00010002-574f-4f20-5370-6865726f2121"
        AntiDOS_characteristic  = "00020005-574f-4f20-5370-6865726f2121"
        DFU_characteristic = "00020002-574f-4f20-5370-6865726f2121"
        DFU2_characteristic = "00020004-574f-4f20-5370-6865726f2121"
        # services = await self.client.get_services()  # Not needed in bleak 2.x

        # Unlock code: prevent the sphero mini from going to sleep again after 10 seconds
        print("[INIT] Writing AntiDOS characteristic unlock code")
        await self.client.write_gatt_char(AntiDOS_characteristic,b"usetheforce...band",response=True)

        # Enable DFU notifications:
        print("[INIT] Enabling DFU notifications")
        await self.client.start_notify(DFU_characteristic, self.handleNotificationDFU)

        # No idea what this is for. Possibly a device ID of sorts? Read request returns '00 00 09 00 0c 00 02 02':
        print("[INIT] Reading DFU2 characteristic")
        await self.client.read_gatt_char(DFU2_characteristic)

        # Enable API notifications:
        print("[INIT] Enabling API_v2 notifications")
        # enable notifications on api characteristic
        await self.client.start_notify(self.API_V2_characteristic, self.handleNotification)

        print("[INIT] Initialization complete\n")

        return True

    async def disconnect(self):
        return await self.client.disconnect()

    async def _send(self, characteristic=None, devID=None, commID=None, payload=[]):
        '''
        Generic "send" method, used by other methods to encode and send commands (or responses) with command ID,
        sequence number, optional payload and calculated checksum to a specified device ID. For internal use only.

        Sphero API (https://sdk.sphero.com/docs/api_spec/general_api/), single packet structure for command & response:
        SOP - FLAG(s) [- TID - SID] - DID - CID - SEQ - [ERR] - [payload] - CHK - EOP // SOP,CHK,EOP excl. from checksum
        SpheroMini uses simplest format (no TID/SID/extFLAG) -> length = 7 + payload_length, Flag bit4,5,7=0
        - SOP: start of packet,  byte always 0x8D
        - FLAG(s): Bit-flags, one or multiple bytes, see sphero_constants.py
            bit0: command(0); response(1)
            bit1: request no response(0), request response(1) - for commands only
            bit2: request not only error response(0), only error response(1) - if command(0) and request response(1)
            bit3: no activity/no timeout reset(0); activity/reset receivers inactivity timeout(1)
            bit4: no TID(0); packet has TID in header(1)
            bit5: no SID(0); packet has SID in header(1)
            bit6: unused
            bit7: single FLAG(0); extended FLAG in next Byte(1)
        - [TID/SID: target/source address by port ID (upper nibble) and node ID (lower nibble), optional see FLAG(s)]
        - DID: virtual device ID, see sphero_constants.py
        - CID: command ID, see sphero_constants.py
        - SEQ: sequence number token to link commands with responses
        - [ERR: command error code for response, optional - see FLAG(s)]
        - payload: Data of varying number of bytes (incl. none), depending on the command/response
        - CHK: checksum as sum of all bytes (excluding SOP & EOP) mod 256, bit-inverted, see below for calculation
        - EOP: end of packet, byte always 0xD8

        Packet encoding(SLIP): SOP & EOP not allowed in rest of bytes for explicit packet structure of variable length;
        parser adds/removes additional escape byte ESC(0xAB) and converts value by binary XOR 0x88
        conversion table: 0xAB <-> 0xAB 0x23, 0x8D <-> 0xAB 0x05, 0xD8 <> 0xAB 0x50 (see sphero_constants.py)
        Note: invalid packet structure if less than 7 bytes (after decoding) including SOP/EOP
        unexpected (but tolerated) escape sequence with double 0xAB or any other escaped value other than SOP/EOP

        '''
        sendBytes = [sendPacketConstants["StartOfPacket"],
                    sum([flags["resetsInactivityTimeout"], flags["requestsResponse"]]),
                    devID,
                    commID,
                    self.sequence] + payload  # concatenate payload list

        self.sequence = (self.sequence + 1) % 256  # increment seq number to link response packets with this command

        # Compute and append checksum and add EOP byte:
        # From Sphero docs: "The [checksum is the] modulo 256 sum of all the bytes
        #                   from the device ID through the end of the data payload,
        #                   bit inverted (1's complement)"
        # For the sphero mini, the flag bits must be included too:
        checksum = 0
        for num in sendBytes[1:]:
            checksum = (checksum + num) & 0xFF # bitwise "and to get modulo 256 sum of appropriate bytes
        checksum = 0xff - checksum # bitwise 'not' to invert checksum bits
        sendBytes += [checksum, sendPacketConstants["EndOfPacket"]]  # concatenate

        # encode with escape sequence
        esc_index = [i for i in range(len(sendBytes)-2, 0, -1)  # loop backwards from EOP to SOP
                    if sendBytes[i] in list(sendPacketConstants.values())]
        for i in esc_index:  # from end to start, because length can change in loop!
            sendBytes[i:i+1] = [sendPacketConstants["ESC"], (sendBytes[i] ^ 0x88)]

        # Convert numbers to bytes
        output = b"".join([x.to_bytes(1, byteorder='big') for x in sendBytes])

        #send to specified characteristic:
        await self.client.write_gatt_char(characteristic, output, response=True)


    async def wake(self):
        '''
        Bring device out of sleep mode (can only be done if device was in sleep, not deep sleep).
        If in deep sleep, the device should be connected to USB power to wake.
        '''
        
        print("[SEND {}] Waking".format(self.sequence))
        
        await self._send(
                    characteristic=self.API_V2_characteristic,
                    devID=deviceID['powerInfo'],
                    commID=powerCommandIDs["wake"],
                    payload=[]) # empty payload

    async def sleep(self, deepSleep=False):
        '''
        Put device to sleep or deep sleep (deep sleep needs USB power connected to wake up)
        '''
        if deepSleep:
            sleepCommID=powerCommandIDs["deepSleep"]
            if self.verbosity > 0:
                print("[INFO] Going into deep sleep. Connect USB power to wake.")
        else:
            sleepCommID=powerCommandIDs["sleep"]
        await self._send(characteristic=self.API_V2_characteristic,
                   devID=deviceID['powerInfo'],
                   commID=sleepCommID,
                   payload=[]) #empty payload

    async def roll(self, speed=None, heading=None):
        '''
        Start to move the Sphero at a given direction and speed.
        heading: integer from 0 - 360 (degrees)
        speed: Integer from 0 - 255
        Note: the zero heading should be set at startup with the resetHeading method. Otherwise, it may
        seem that the sphero doesn't honor the heading argument
        '''
        print("[SEND {}] Rolling with speed {} and heading {}".format(self.sequence, speed, heading))
    
        if abs(speed) > 255:
            print("WARNING: roll speed parameter outside of allowed range (-255 to +255)")

        if speed < 0:
            speed = -1*speed+256 # speed values > 256 in the send packet make the spero go in reverse

        speedH = (speed & 0xFF00) >> 8
        speedL = speed & 0xFF
        headingH = (heading & 0xFF00) >> 8
        headingL = heading & 0xFF
        await self._send(characteristic = self.API_V2_characteristic,
                  devID = deviceID['driving'],
                  commID = drivingCommands["driveWithHeading"],
                  payload = [speedL, headingH, headingL, speedH])

    async def setLEDColor(self, red = None, green = None, blue = None):
        '''
        Set device LED color based on RGB vales (each can  range between 0 and 0xFF)
        '''
        print("[SEND {}] Setting main LED colour to [{}, {}, {}]".format(self.sequence, red, green, blue))
        
        await self._send(characteristic = self.API_V2_characteristic,
                  devID = deviceID['userIO'], # 0x1a
                  commID = userIOCommandIDs["allLEDs"], # 0x0e
                  payload = [0x00, 0x0e, red, green, blue])

    async def getVoltage(self):
        '''
        Get battery voltage
        '''
        print("[SEND {}] Getting battery voltage]".format(self.sequence))

        await self._send(characteristic = self.API_V2_characteristic,
                  devID = deviceID['powerInfo'],  # 0x13
                  commID = powerCommandIDs["batteryVoltage"],  # 0x03
                  payload = [])

    def clear_notification(self):
        self.notification_ack = "DEFAULT ACK"
        self.notification_seq = -1

    def bits_to_num(self, bits):
        '''
        This helper function decodes bytes from sensor packets into single precision floats. Encoding follows the
        the IEEE-754 standard.
        '''
        num = int(bits, 2).to_bytes(len(bits) // 8, byteorder='little')
        num = struct.unpack('f', num)[0]
        return num

    
    async def getAcknowledgement(self, ack):
        #wait up to 10 secs for correct acknowledgement to come in, including sequence number!
        start = time.time()
        while(1):
            await asyncio.sleep(0.01)
            # TODO self.p.waitForNotifications(1)
            
            if self.notification_seq == (self.sequence-1) % 256: # use one less than sequence, because _send function increments it for next send.
                print("[RESP {}] {}".format(self.sequence-1, self.notification_ack))
                self.clear_notification()
                break
            elif self.notification_seq >= 0:
                print("Unexpected ACK. Expected: {}/{}, received: {}/{}".format(
                    ack, self.sequence, self.notification_ack.split()[0],
                    self.notification_seq),
                    file=sys.stderr)
            if time.time() > start + 10:
                print("Timeout waiting for acknowledgement: {}/{}".format(ack, self.sequence), file=sys.stderr)
                break

    def handleNotificationDFU(self, sender, data):
        pass

    def handleNotification(self, sender, data):
        """
        This method acts as an interrupt service routine. When a notification comes in, this
        method is invoked, with the variable 'cHandle' being the handle of the characteristic that
        sent the notification, and 'data' being the payload (sent one byte at a time, so the packet
        needs to be reconstructed)  
        The method keeps appending bytes to the payload packet byte list until end-of-packet byte is
        encountered. Data encoding/decoding prevents any payload or frame data to be mis-interpreted as end-of-packet.
        """

        # collect until end of packet:
        self.notificationPacket.extend(data)  # add new single or multiple bytes to packet list

        # discard if first byte not start-of-packet
        if self.notificationPacket[0] != sendPacketConstants['StartOfPacket']:
            print("Warning: discarding unexpected data before SOP:", self.notificationPacket, file=sys.stderr)
            self.notificationPacket = []

        # parse on EndOfPacket received structure similar to send packets (see docstring in sphero_mini._send())
        elif self.notificationPacket[-1] == sendPacketConstants['EndOfPacket']:

            # decode
            esc_index = [i for i in range(len(self.notificationPacket)-2, 0, -1)  # descending index between EOP and SOP
                         if self.notificationPacket[i] == sendPacketConstants["ESC"] ]
            for i in esc_index:  # from end to start, because length can change in loop!
                self.notificationPacket.__delitem__(i)
                self.notificationPacket[i] ^= 0x88

            # Attempt to unpack. Might fail if packet is too badly corrupted
            try:
                start, flags_bits, devid, commcode, seq, *notification_payload, chsum, end = self.notificationPacket
            except ValueError:
                print("Warning: notification packet unparseable", self.notificationPacket, file=sys.stderr)
                self.notificationPacket = [] # Discard this packet
                return # exit

            # Compute and append checksum and add EOP byte:
            # From Sphero docs: "The [checksum is the] modulo 256 sum of all the bytes
            #                   from the device ID through the end of the data payload,
            #                   bit inverted (1's complement)"
            # For the sphero mini, the flag bits must be included too:
            checksum_bytes = [flags_bits, devid, commcode, seq] + notification_payload
            checksum = 0 # init
            for num in checksum_bytes:
                checksum = (checksum + num) & 0xFF # bitwise "and to get modulo 256 sum of appropriate bytes
            checksum = 0xff - checksum # bitwise 'not' to invert checksum bits
            if checksum != chsum: # check computed checksum against that recieved in the packet
                print("Warning: notification packet checksum failed", self.notificationPacket, file=sys.stderr)
                self.notificationPacket = [] # Discard this packet
                return  # exit

            # Check if response packet:
            if flags_bits & flags['isResponse']:  # it is a response

                # Use device ID and command code to determine which command is being acknowledged:
                if devid == deviceID['powerInfo'] and commcode == powerCommandIDs['wake']:
                    self.notification_ack = "Wake acknowledged" # Acknowledgement after wake command

                elif devid == deviceID['driving'] and commcode == drivingCommands['driveWithHeading']:
                    self.notification_ack = "Roll command acknowledged"

                elif devid == deviceID['driving'] and commcode == drivingCommands['stabilization']:
                    self.notification_ack = "Stabilization command acknowledged"

                elif devid == deviceID['userIO'] and commcode == userIOCommandIDs['allLEDs']:
                    self.notification_ack = "LED/backlight color command acknowledged"

                elif devid == deviceID['driving'] and commcode == drivingCommands["resetHeading"]:
                    self.notification_ack = "Heading reset command acknowledged"

                elif devid == deviceID['sensor'] and commcode == sensorCommands["configureCollision"]:
                    self.notification_ack = "Collision detection configuration acknowledged"

                elif devid == deviceID['sensor'] and commcode == sensorCommands["configureSensorStream"]:
                    self.notification_ack = "Sensor stream configuration acknowledged"

                elif devid == deviceID['sensor'] and commcode == sensorCommands["sensorMask"]:
                    self.notification_ack = "Mask configuration acknowledged"

                elif devid == deviceID['sensor'] and commcode == sensorCommands["sensor1"]:
                    self.notification_ack = "Sensor1 acknowledged"

                elif devid == deviceID['sensor'] and commcode == sensorCommands["sensor2"]:
                    self.notification_ack = "Sensor2 acknowledged"

                elif devid == deviceID['powerInfo'] and commcode == powerCommandIDs['batteryVoltage']:
                    V_batt = notification_payload[2] + notification_payload[1]*256 + notification_payload[0]*65536
                    V_batt /= 100 # Notification gives V_batt in 10mV increments. Divide by 100 to get to volts.
                    self.notification_ack = "Battery voltage:" + str(V_batt) + "v"
                    self.v_batt = V_batt

                elif devid == deviceID['systemInfo'] and commcode == SystemInfoCommands['mainApplicationVersion']:
                    version = '.'.join(str(x) for x in notification_payload)
                    self.notification_ack = "Firmware version: " + version
                    self.firmware_version = notification_payload

                else:
                    self.notification_ack = "Unknown acknowledgement"  #print(self.notificationPacket)
                    print(self.notificationPacket, "===================> Unknown ack packet")

                self.notification_seq = seq

            else: # Not a response packet - therefore, asynchronous notification (e.g. collision detection, etc):

                # Collision detection:
                if devid == deviceID['sensor'] and commcode == sensorCommands['collisionDetectedAsync']:
                    # The first four bytes are data that is still un-parsed. the remaining unsaved bytes are always zeros
                    _, _, _, _, _, _, axis, _, Y_mag, _, X_mag, *_ = notification_payload
                    if axis == 1:
                        dir = "Left/right"
                    else:
                        dir = 'Forward/back'
                    print("Collision detected:")
                    print("\tAxis:", dir)
                    print("\tX_mag:", X_mag)
                    print("\tY_mag:", Y_mag)

                    if self.collision_detection_callback is not None:
                        self.notificationPacket = [] # need to clear packet, in case new notification comes in during callback
                        self.collision_detection_callback()

                # Sensor response:
                elif devid == deviceID['sensor'] and commcode == sensorCommands['sensorResponse']:
                    # Convert to binary, pad bytes with leading zeros:
                    val = ''
                    for byte in notification_payload:
                        val += format(int(bin(byte)[2:], 2), '#010b')[2:]

                    # Break into 32-bit chunks
                    nums = []
                    while(len(val) > 0):
                        num, val = val[:32], val[32:] # Slice off first 16 bits
                        nums.append(num)

                    # convert from raw bits to float:
                    nums = [self.bits_to_num(num) for num in nums]

                    # Set sensor values as class attributes:
                    for name, value in zip(self.configured_sensors, nums):
                        setattr(name, value)

                # Unrecognized packet structure:
                else:
                    self.notification_ack = "Unknown asynchronous notification" #print(self.notificationPacket)
                    print(self.notificationPacket, "===================> Unknown async packet")

            self.notificationPacket = []  # Start new packet after this byte
            # packet parsing done
        # handleNotification done
