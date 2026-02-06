// ESP32-CAM UDP Broadcast - No HTTP, direct UDP packets
// Bypasses all router/firewall issues

#include <WiFi.h>
#include <WiFiUdp.h>
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

const char* SSID = "SpectrumSetup-617D";
const char* PASS = "smoothcurrent945";

// UDP broadcast - sends to all devices on network
const int UDP_PORT = 5556;
const char* BROADCAST_IP = "192.168.1.255";  // Broadcast to whole subnet

WiFiUDP udp;
bool cameraOK = false;

void blink(int times, int ms) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_GPIO_NUM, LOW);
    delay(ms);
    digitalWrite(LED_GPIO_NUM, HIGH);
    delay(ms);
  }
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  pinMode(LED_GPIO_NUM, OUTPUT);
  digitalWrite(LED_GPIO_NUM, HIGH);
  
  Serial.println("\n=== ESP32-CAM UDP ===");
  blink(2, 100);  // Starting

  // Init camera
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
  cfg.frame_size = FRAMESIZE_VGA;  // 640x480 - smaller for UDP
  cfg.jpeg_quality = 15;
  cfg.fb_count = 1;

  cameraOK = (esp_camera_init(&cfg) == ESP_OK);
  Serial.println(cameraOK ? "Camera OK" : "Camera FAIL");
  blink(cameraOK ? 3 : 10, 100);

  // WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  
  Serial.print("WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi FAIL");
    blink(20, 50);
    ESP.restart();
  }
  
  Serial.printf("\nIP: %s\n", WiFi.localIP().toString().c_str());
  blink(5, 100);  // WiFi OK

  // Start UDP
  udp.begin(UDP_PORT);
  Serial.printf("UDP on port %d\n", UDP_PORT);
  
  // Send announcement
  udp.beginPacket(BROADCAST_IP, UDP_PORT);
  udp.printf("CAMERA:%s:ONLINE:%s", WiFi.localIP().toString().c_str(), cameraOK ? "READY" : "ERROR");
  udp.endPacket();
  
  Serial.println("Ready for capture");
}

void sendPhotoUDP() {
  if (!cameraOK) return;
  
  digitalWrite(LED_GPIO_NUM, LOW);
  camera_fb_t *fb = esp_camera_fb_get();
  digitalWrite(LED_GPIO_NUM, HIGH);
  
  if (!fb) {
    Serial.println("Capture failed");
    return;
  }
  
  Serial.printf("Photo: %d bytes\n", fb->len);
  
  // Send in chunks via UDP
  const int chunkSize = 1400;  // Max UDP packet
  int totalChunks = (fb->len + chunkSize - 1) / chunkSize;
  
  // Send header
  udp.beginPacket(BROADCAST_IP, UDP_PORT);
  udp.printf("START:%d:%d", fb->len, totalChunks);
  udp.endPacket();
  delay(10);
  
  // Send chunks
  for (int i = 0; i < totalChunks; i++) {
    int offset = i * chunkSize;
    int size = min(chunkSize, (int)fb->len - offset);
    
    udp.beginPacket(BROADCAST_IP, UDP_PORT);
    udp.write(fb->buf + offset, size);
    udp.endPacket();
    
    delay(5);  // Small delay between packets
    Serial.print(".");
  }
  
  // Send end marker
  delay(10);
  udp.beginPacket(BROADCAST_IP, UDP_PORT);
  udp.print("END");
  udp.endPacket();
  
  esp_camera_fb_return(fb);
  Serial.println(" Sent!");
  blink(3, 50);  // Success
}

void loop() {
  // Check for UDP command
  int packetSize = udp.parsePacket();
  if (packetSize) {
    char buffer[255];
    int len = udp.read(buffer, 255);
    if (len > 0) buffer[len] = 0;
    
    Serial.printf("UDP: %s\n", buffer);
    
    if (strstr(buffer, "CAPTURE") || strstr(buffer, "SNAP")) {
      Serial.println("Capture command received!");
      sendPhotoUDP();
    }
  }
  
  // Auto-capture every 30 seconds
  static unsigned long lastCapture = 0;
  if (millis() - lastCapture > 30000) {
    sendPhotoUDP();
    lastCapture = millis();
  }
  
  delay(10);
}
