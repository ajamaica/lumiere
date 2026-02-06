// ESP32-CAM ESP-NOW Transmitter - AUTO-DISCOVERY VERSION
// Scans for base station automatically!

#include <esp_now.h>
#include <WiFi.h>
#include "esp_camera.h"

// AI-Thinker ESP32-CAM pins
#define PWDN_GPIO_NUM     32
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#define LED_GPIO_NUM       4

#define CHUNK_SIZE 200

uint8_t baseMacAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};  // Will be auto-discovered
bool baseFound = false;

void onReceive(const uint8_t *mac, const uint8_t *data, int len) {
  // Look for base station beacon
  if (len > 5 && memcmp(data, "BASE:", 5) == 0) {
    memcpy(baseMacAddress, mac, 6);
    baseFound = true;
    Serial.print("Found base: ");
    for (int i = 0; i < 6; i++) {
      Serial.printf("%02X", mac[i]);
      if (i < 5) Serial.print(":");
    }
    Serial.println();
  }
}

void onSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  // Send callback
}

bool initCamera() {
  camera_config_t cfg;
  cfg.ledc_channel = LEDC_CHANNEL_0;
  cfg.ledc_timer = LEDC_TIMER_0;
  cfg.pin_pwdn = PWDN_GPIO_NUM;
  cfg.pin_reset = -1;
  cfg.pin_xclk = XCLK_GPIO_NUM;
  cfg.pin_sccb_sda = SIOD_GPIO_NUM;
  cfg.pin_sccb_scl = SIOC_GPIO_NUM;
  cfg.pin_d7 = Y9_GPIO_NUM;
  cfg.pin_d6 = Y8_GPIO_NUM;
  cfg.pin_d5 = Y7_GPIO_NUM;
  cfg.pin_d4 = Y6_GPIO_NUM;
  cfg.pin_d3 = Y5_GPIO_NUM;
  cfg.pin_d2 = Y4_GPIO_NUM;
  cfg.pin_d1 = Y3_GPIO_NUM;
  cfg.pin_d0 = Y2_GPIO_NUM;
  cfg.pin_vsync = VSYNC_GPIO_NUM;
  cfg.pin_href = HREF_GPIO_NUM;
  cfg.pin_pclk = PCLK_GPIO_NUM;
  cfg.xclk_freq_hz = 20000000;
  cfg.pixel_format = PIXFORMAT_JPEG;
  cfg.frame_size = FRAMESIZE_VGA;
  cfg.jpeg_quality = 15;
  cfg.fb_count = 1;
  
  return (esp_camera_init(&cfg) == ESP_OK);
}

void sendPhoto() {
  if (!baseFound) {
    Serial.println("No base station found yet!");
    return;
  }
  
  digitalWrite(LED_GPIO_NUM, LOW);
  camera_fb_t *fb = esp_camera_fb_get();
  digitalWrite(LED_GPIO_NUM, HIGH);
  
  if (!fb) {
    Serial.println("Capture failed!");
    return;
  }
  
  Serial.printf("Sending %d bytes...\n", fb->len);
  
  // Send START
  char startMsg[32];
  sprintf(startMsg, "START:%d", fb->len);
  esp_now_send(baseMacAddress, (uint8_t*)startMsg, strlen(startMsg));
  delay(50);
  
  // Send chunks
  int sent = 0;
  while (sent < fb->len) {
    int chunk = min(CHUNK_SIZE, (int)fb->len - sent);
    esp_err_t result = esp_now_send(baseMacAddress, fb->buf + sent, chunk);
    if (result == ESP_OK) {
      sent += chunk;
      Serial.print(".");
      delay(20);
    } else {
      Serial.print("X");
      delay(50);
    }
  }
  
  // Send END
  delay(50);
  esp_now_send(baseMacAddress, (uint8_t*)"END", 3);
  
  esp_camera_fb_return(fb);
  Serial.printf("\nSent %d bytes!\n", sent);
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  pinMode(LED_GPIO_NUM, OUTPUT);
  digitalWrite(LED_GPIO_NUM, HIGH);
  
  Serial.println("\n=== ESP32-CAM ESP-NOW (Auto-Discovery) ===");
  
  // Init camera
  if (!initCamera()) {
    Serial.println("Camera init failed!");
    return;
  }
  Serial.println("Camera OK");
  
  // WiFi station mode
  WiFi.mode(WIFI_STA);
  Serial.print("Camera MAC: ");
  Serial.println(WiFi.macAddress());
  
  // Init ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed!");
    return;
  }
  
  esp_now_register_recv_cb(onReceive);
  esp_now_register_send_cb(onSent);
  
  // Broadcast peer (for discovery)
  uint8_t broadcast[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  esp_now_peer_info_t peerInfo;
  memcpy(peerInfo.peer_addr, broadcast, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;
  esp_now_add_peer(&peerInfo);
  
  Serial.println("Waiting for base station...");
  
  // Wait for base to be discovered
  int attempts = 0;
  while (!baseFound && attempts < 30) {
    Serial.print(".");
    delay(500);
    attempts++;
  }
  
  if (baseFound) {
    // Add the real peer
    memcpy(peerInfo.peer_addr, baseMacAddress, 6);
    esp_now_add_peer(&peerInfo);
    Serial.println("\nBase found! Sending photo...");
    delay(500);
    sendPhoto();
  } else {
    Serial.println("\nNo base found. Will retry sending.");
  }
}

void loop() {
  // Keep looking for base and sending photos
  static unsigned long lastSend = 0;
  
  if (!baseFound) {
    // Still looking...
    delay(100);
    return;
  }
  
  // Send every 30 seconds
  if (millis() - lastSend > 30000) {
    sendPhoto();
    lastSend = millis();
  }
  delay(100);
}
