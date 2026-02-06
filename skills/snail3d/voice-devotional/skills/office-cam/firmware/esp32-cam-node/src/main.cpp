// ESP32-CAM Multi-Camera Node
// Pushes photos to central server on trigger

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
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

// CONFIGURATION - EDIT THESE
const char* WIFI_SSID = "SpectrumSetup-617D";
const char* WIFI_PASS = "smoothcurrent945";
const char* DEVICE_ID = "cam-01";  // Change for each camera: cam-02, cam-03, etc.
const char* SERVER_URL = "http://192.168.1.139:5555/capture";  // Your Mac's IP

// Camera settings
const int CAPTURE_INTERVAL = 30000;  // Auto-capture every 30 seconds (0 to disable)

WiFiServer cmdServer(8080);  // Command server for remote trigger
bool cameraReady = false;
unsigned long lastCapture = 0;

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
  cfg.frame_size = FRAMESIZE_SVGA;  // 800x600
  cfg.jpeg_quality = 10;
  cfg.fb_count = 1;

  esp_err_t err = esp_camera_init(&cfg);
  return (err == ESP_OK);
}

bool sendPhoto() {
  if (!cameraReady) return false;

  digitalWrite(LED_GPIO_NUM, LOW);  // LED on
  camera_fb_t *fb = esp_camera_fb_get();
  digitalWrite(LED_GPIO_NUM, HIGH); // LED off

  if (!fb) {
    Serial.println("Capture failed");
    return false;
  }

  Serial.printf("Sending %d bytes to server...\n", fb->len);

  HTTPClient http;
  http.setTimeout(10000);
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("X-Device-ID", DEVICE_ID);
  
  int httpCode = http.POST(fb->buf, fb->len);
  esp_camera_fb_return(fb);
  
  if (httpCode == 200) {
    Serial.println("Photo sent!");
    http.end();
    return true;
  } else {
    Serial.printf("Send failed: %d\n", httpCode);
    http.end();
    return false;
  }
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n=== ESP32-CAM Node ===");
  Serial.printf("Device: %s\n", DEVICE_ID);

  pinMode(LED_GPIO_NUM, OUTPUT);
  digitalWrite(LED_GPIO_NUM, HIGH);

  // Init camera
  cameraReady = initCamera();
  Serial.println(cameraReady ? "Camera OK" : "Camera FAIL");

  // Connect WiFi
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(DEVICE_ID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("WiFi connecting");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi FAIL - restarting");
    ESP.restart();
  }

  Serial.printf("\nIP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("Server: %s\n", SERVER_URL);

  // Start command server
  cmdServer.begin();
  Serial.println("Command server on port 8080");
  
  // Send initial photo
  Serial.println("Sending test photo...");
  sendPhoto();
}

void loop() {
  // Check for remote trigger commands
  WiFiClient client = cmdServer.available();
  if (client) {
    String req = client.readStringUntil('\r');
    client.readStringUntil('\n');
    
    if (req.indexOf("CAPTURE") >= 0 || req.indexOf("/capture") >= 0) {
      Serial.println("Remote trigger received!");
      client.println("HTTP/1.1 200 OK");
      client.println("Content-Type: text/plain");
      client.println();
      
      if (sendPhoto()) {
        client.println("OK");
      } else {
        client.println("FAIL");
      }
      client.stop();
    } else {
      client.println("HTTP/1.1 200 OK");
      client.println("Content-Type: text/plain");
      client.println();
      client.printf("ESP32-CAM %s\n", DEVICE_ID);
      client.printf("Status: %s\n", cameraReady ? "READY" : "ERROR");
      client.stop();
    }
  }

  // Auto-capture
  if (CAPTURE_INTERVAL > 0 && millis() - lastCapture > CAPTURE_INTERVAL) {
    Serial.println("Auto-capture...");
    sendPhoto();
    lastCapture = millis();
  }

  // WiFi reconnect
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, reconnecting...");
    WiFi.reconnect();
    delay(5000);
  }

  delay(10);
}
