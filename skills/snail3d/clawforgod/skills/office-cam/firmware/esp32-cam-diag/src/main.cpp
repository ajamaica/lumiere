// ESP32-CAM Diagnostic - Blinks LED to show status
#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_camera.h"

void blink(int count, int ms);  // Forward declaration

// Pins
#define PWDN_GPIO_NUM 32
#define XCLK_GPIO_NUM  0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM   35
#define Y8_GPIO_NUM   34
#define Y7_GPIO_NUM   39
#define Y6_GPIO_NUM   36
#define Y5_GPIO_NUM   21
#define Y4_GPIO_NUM   19
#define Y3_GPIO_NUM   18
#define Y2_GPIO_NUM    5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM  23
#define PCLK_GPIO_NUM  22
#define LED_GPIO_NUM    4

const char* SSID = "SpectrumSetup-617D";
const char* PASS = "smoothcurrent945";
const char* SERVER = "http://192.168.1.139:5555/capture";

void setup() {
  pinMode(LED_GPIO_NUM, OUTPUT);
  digitalWrite(LED_GPIO_NUM, HIGH);  // LED off
  
  // Blink = starting
  blink(2, 200);
  
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
  cfg.frame_size = FRAMESIZE_VGA;
  cfg.jpeg_quality = 12;
  cfg.fb_count = 1;
  
  bool camOK = (esp_camera_init(&cfg) == ESP_OK);
  blink(camOK ? 3 : 10, 100);  // 3 blinks = cam OK, 10 = fail
  
  // WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    tries++;
  }
  
  bool wifiOK = (WiFi.status() == WL_CONNECTED);
  blink(wifiOK ? 5 : 15, 100);  // 5 blinks = WiFi OK
  
  if (!wifiOK) ESP.restart();
  
  // Send photo
  if (camOK) {
    delay(1000);
    camera_fb_t *fb = esp_camera_fb_get();
    if (fb) {
      HTTPClient http;
      http.begin(SERVER);
      http.addHeader("Content-Type", "image/jpeg");
      http.addHeader("X-Device-ID", "test-cam");
      int code = http.POST(fb->buf, fb->len);
      esp_camera_fb_return(fb);
      
      blink(code == 200 ? 8 : 20, 100);  // 8 = sent OK, 20 = fail
    }
  }
}

void blink(int count, int ms) {
  for (int i = 0; i < count; i++) {
    digitalWrite(LED_GPIO_NUM, LOW);   // On
    delay(ms);
    digitalWrite(LED_GPIO_NUM, HIGH);  // Off
    delay(ms);
  }
  delay(500);
}

void loop() {
  // Keep alive blink
  digitalWrite(LED_GPIO_NUM, LOW);
  delay(50);
  digitalWrite(LED_GPIO_NUM, HIGH);
  delay(5000);
}
