// ESP-NOW Base Station
// Receives photos from ESP32-CAMs via ESP-NOW (no WiFi router needed)
// Plug into Mac via USB, photos save to SD or stream to serial

#include <esp_now.h>
#include <WiFi.h>
#include <SD.h>
#include <SPI.h>

void savePhoto();  // Forward declaration

// SD card pins (adjust for your board)
#define SD_CS 5

// Photo buffer
#define MAX_PHOTO_SIZE 50000
uint8_t photoBuffer[MAX_PHOTO_SIZE];
uint32_t photoSize = 0;
uint32_t photoOffset = 0;

// Peer info
esp_now_peer_info_t peerInfo;

// Callback when data received
void onReceive(const uint8_t *mac, const uint8_t *data, int len) {
  if (len < 10) {
    // Control packet
    char msg[32];
    memcpy(msg, data, min(len, 31));
    msg[min(len, 31)] = 0;
    
    if (strncmp(msg, "START:", 6) == 0) {
      photoSize = atoi(msg + 6);
      photoOffset = 0;
      Serial.printf("Receiving photo: %d bytes\n", photoSize);
    }
    else if (strcmp(msg, "END") == 0) {
      Serial.println("Photo complete!");
      savePhoto();
    }
    return;
  }
  
  // Data chunk
  if (photoOffset + len <= MAX_PHOTO_SIZE) {
    memcpy(photoBuffer + photoOffset, data, len);
    photoOffset += len;
    Serial.print(".");
  }
}

void savePhoto() {
  if (photoOffset == 0) return;
  
  // Generate filename
  char filename[32];
  sprintf(filename, "/photo_%lu.jpg", millis());
  
  File file = SD.open(filename, FILE_WRITE);
  if (file) {
    file.write(photoBuffer, photoOffset);
    file.close();
    Serial.printf("\nSaved: %s (%d bytes)\n", filename, photoOffset);
  } else {
    Serial.println("\nSD write failed!");
    // Output to serial for computer capture
    Serial.println("---PHOTO_START---");
    Serial.write(photoBuffer, photoOffset);
    Serial.println("---PHOTO_END---");
  }
  
  photoOffset = 0;
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n=== ESP-NOW Base Station ===");
  
  // Init SD (optional)
  if (SD.begin(SD_CS)) {
    Serial.println("SD card OK");
  } else {
    Serial.println("No SD - photos to serial");
  }
  
  // Set WiFi to station mode
  WiFi.mode(WIFI_STA);
  
  // Print MAC address
  Serial.print("Base MAC: ");
  Serial.println(WiFi.macAddress());
  
  // Init ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed!");
    return;
  }
  
  // Register receive callback
  esp_now_register_recv_cb(onReceive);
  
  Serial.println("Ready to receive from cameras");
  Serial.println("Flash this MAC into your ESP32-CAMs:");
  Serial.println(WiFi.macAddress());
}

void loop() {
  // Broadcast beacon every 2 seconds for auto-discovery
  static unsigned long lastBeacon = 0;
  if (millis() - lastBeacon > 2000) {
    uint8_t broadcast[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_send(broadcast, (uint8_t*)"BASE:HELLO", 10);
    lastBeacon = millis();
    Serial.println("Beacon sent");
  }
  delay(100);
}
