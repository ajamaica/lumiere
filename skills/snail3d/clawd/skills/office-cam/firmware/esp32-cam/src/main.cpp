// ESP32-CAM HTTP Server (AI-Thinker module)
// Exposes: GET /capture -> returns JPEG image

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"

// ==================== PIN DEFINITIONS ====================
// AI-Thinker ESP32-CAM Pinout
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
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
#define LED_GPIO_NUM       4  // Onboard LED

// ==================== CONFIGURATION ====================
const char* WIFI_SSID = "SpectrumSetup-617D";
const char* WIFI_PASS = "smoothcurrent945";
const char* DEVICE_NAME = "ESP32-CAM";
const int SERVER_PORT = 80;

// ==================== GLOBALS ====================
WebServer server(SERVER_PORT);
bool cameraInitialized = false;

// ==================== CAMERA SETUP ====================
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;

  // XCLK 20MHz or 10MHz for OV2640
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Frame buffer config
  config.frame_size = FRAMESIZE_UXGA;  // 1600x1200
  config.jpeg_quality = 10;  // 0-63, lower is higher quality
  config.fb_count = 2;  // 2 frame buffers

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed! Error 0x%x\n", err);
    return false;
  }

  // Camera sensor settings
  sensor_t *s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, 0);
    s->set_contrast(s, 0);
    s->set_saturation(s, 0);
    s->set_special_effect(s, 0);
    s->set_whitebal(s, 1);
    s->set_awb_gain(s, 1);
    s->set_wb_mode(s, 0);
    s->set_exposure_ctrl(s, 1);
    s->set_aec2(s, 0);
    s->set_ae_level(s, 0);
    s->set_gain_ctrl(s, 1);
    s->set_agc_gain(s, 0);
    s->set_gainceiling(s, (gainceiling_t)0);
    s->set_bpc(s, 0);
    s->set_wpc(s, 1);
    s->set_raw_gma(s, 1);
    s->set_lenc(s, 1);
    s->set_hmirror(s, 0);
    s->set_vflip(s, 0);
    s->set_dcw(s, 1);
    s->set_colorbar(s, 0);
  }

  // Turn on LED
  pinMode(LED_GPIO_NUM, OUTPUT);
  digitalWrite(LED_GPIO_NUM, LOW);  // LED is active low

  Serial.println("Camera initialized successfully");
  return true;
}

// ==================== HTTP HANDLERS ====================
void handleRoot() {
  String html = "<!DOCTYPE html><html>"
    "<head><title>" + String(DEVICE_NAME) + "</title></head>"
    "<body>"
    "<h1>" + String(DEVICE_NAME) + "</h1>"
    "<p>Status: <b>" + String(cameraInitialized ? "Online" : "Camera Error") + "</b></p>"
    "<p>Endpoints:</p>"
    "<ul>"
    "<li><a href='/capture'>/capture</a> - Take a photo (returns JPEG)</li>"
    "<li><a href='/status'>/status</a> - Device status (JSON)</li>"
    "</ul>"
    + String(cameraInitialized ? "<p><img src='/capture' width='640'></p>" : "<p>Camera not initialized</p>") +
    "</body></html>";
  server.send(200, "text/html", html);
}

void handleCapture() {
  if (!cameraInitialized) {
    server.send(503, "application/json", "{\"error\":\"Camera not initialized\"}");
    return;
  }

  Serial.println("Capturing photo...");
  
  // Flash LED
  digitalWrite(LED_GPIO_NUM, HIGH);
  delay(100);
  
  camera_fb_t *fb = esp_camera_fb_get();
  
  digitalWrite(LED_GPIO_NUM, LOW);
  
  if (!fb) {
    Serial.println("Camera capture failed!");
    server.send(500, "text/plain", "Camera capture failed");
    return;
  }

  Serial.printf("Captured: %dx%d, %d bytes\n", fb->width, fb->height, fb->len);

  server.sendHeader("Content-Type", "image/jpeg");
  server.sendHeader("Content-Length", String(fb->len));
  server.sendHeader("Cache-Control", "no-cache");
  server.send(200, "image/jpeg", "");
  server.sendContent((const char*)fb->buf, fb->len);

  esp_camera_fb_return(fb);
  Serial.println("Photo sent successfully");
}

void handleStatus() {
  String json = "{";
  json += "\"device\":\"" + String(DEVICE_NAME) + "\",";
  json += "\"camera_ready\":" + String(cameraInitialized ? "true" : "false") + ",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"uptime\":" + String(millis() / 1000) + ",";
  json += "\"free_heap\":" + String(ESP.getFreeHeap());
  json += "}";
  
  server.sendHeader("Content-Type", "application/json");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void handleNotFound() {
  server.send(404, "text/plain", "Not Found");
}

// ==================== SETUP & LOOP ====================
void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println("\n\n=== ESP32-CAM HTTP Server ===");
  
  // Initialize camera
  cameraInitialized = initCamera();
  if (!cameraInitialized) {
    Serial.println("WARNING: Camera init failed!");
    delay(2000);
  }

  // Connect to WiFi
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(DEVICE_NAME);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi connection failed!");
    delay(1000);
    ESP.restart();
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Setup web server
  server.on("/", HTTP_GET, handleRoot);
  server.on("/capture", HTTP_GET, handleCapture);
  server.on("/status", HTTP_GET, handleStatus);
  server.onNotFound(handleNotFound);

  server.begin();
  Serial.printf("HTTP server started on port %d\n", SERVER_PORT);
  Serial.println("Ready! Visit http://" + WiFi.localIP().toString() + "/capture");
}

void loop() {
  server.handleClient();
  delay(1);
}
