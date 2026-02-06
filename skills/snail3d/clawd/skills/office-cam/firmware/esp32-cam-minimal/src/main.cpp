// ESP32-CAM Ultra-Minimal Server
// Low memory, high reliability

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"

// AI-Thinker pins
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

const char* WIFI_SSID = "SpectrumSetup-617D";
const char* WIFI_PASS = "smoothcurrent945";

WiFiServer server(80);
bool camOK = false;

void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("\n=== BOOT ===");

  // Init camera - tiny frame to save RAM
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
  cfg.xclk_freq_hz = 16000000;  // Lower clock
  cfg.pixel_format = PIXFORMAT_JPEG;
  cfg.frame_size = FRAMESIZE_QVGA;  // 320x240 - tiny!
  cfg.jpeg_quality = 15;  // Lower quality
  cfg.fb_count = 1;

  camOK = (esp_camera_init(&cfg) == ESP_OK);
  Serial.println(camOK ? "CAM OK" : "CAM FAIL");

  // WiFi
  WiFi.mode(WIFI_STA);
  WiFi.setHostname("esp32cam");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  Serial.print("WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("FAIL - restarting");
    ESP.restart();
  }
  
  Serial.printf("\nIP: %s\n", WiFi.localIP().toString().c_str());

  // Raw socket server
  server.begin();
  Serial.println("SERVER STARTED");
  Serial.printf("TEST: curl http://%s/\n", WiFi.localIP().toString().c_str());
}

void loop() {
  WiFiClient client = server.available();
  if (!client) {
    delay(1);
    return;
  }

  Serial.println("Client connected!");
  
  // Wait for request
  unsigned long timeout = millis();
  while (!client.available() && millis() - timeout < 3000) {
    delay(1);
  }

  // Read first line
  String req = client.readStringUntil('\r');
  client.readStringUntil('\n');
  
  Serial.println(req);

  if (req.indexOf("/capture") >= 0 && camOK) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (fb) {
      client.println("HTTP/1.1 200 OK");
      client.println("Content-Type: image/jpeg");
      client.printf("Content-Length: %d\r\n", fb->len);
      client.println("Connection: close");
      client.println();
      client.write(fb->buf, fb->len);
      esp_camera_fb_return(fb);
      Serial.println("Photo sent");
    } else {
      client.println("HTTP/1.1 500 Error");
      client.println();
    }
  } else if (req.indexOf("/status") >= 0) {
    String json = "{\"ip\":\"" + WiFi.localIP().toString() + "\",\"cam\":" + (camOK ? "true" : "false") + "}";
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: application/json");
    client.println("Connection: close");
    client.println();
    client.println(json);
  } else {
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: text/html");
    client.println("Connection: close");
    client.println();
    client.print("<h1>ESP32-CAM</h1><p>Cam: ");
    client.print(camOK ? "OK" : "FAIL");
    client.print("</p><p><a href='/capture'>Photo</a></p>");
  }
  
  client.stop();
  Serial.println("Client done");
}
