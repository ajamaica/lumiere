// ESP32-CAM Minimal Diagnostic
// Shows status via LED only
// No network, just blinks to show what's working

#include <WiFi.h>
#include "esp_camera.h"

#define LED_GPIO_NUM 4

void blink(int times, int onMs, int offMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_GPIO_NUM, LOW);   // LED ON
    delay(onMs);
    digitalWrite(LED_GPIO_NUM, HIGH);  // LED OFF  
    delay(offMs);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_GPIO_NUM, OUTPUT);
  digitalWrite(LED_GPIO_NUM, HIGH);  // Start OFF
  
  // PATTERN: Quick 3 blinks = Boot started
  blink(3, 100, 100);
  delay(500);
  
  // Test 1: Camera init
  camera_config_t cfg;
  cfg.ledc_channel = LEDC_CHANNEL_0;
  cfg.ledc_timer = LEDC_TIMER_0;
  cfg.pin_pwdn = 32;
  cfg.pin_reset = -1;
  cfg.pin_xclk = 0;
  cfg.pin_sccb_sda = 26;
  cfg.pin_sccb_scl = 27;
  cfg.pin_d7 = 35;
  cfg.pin_d6 = 34;
  cfg.pin_d5 = 39;
  cfg.pin_d4 = 36;
  cfg.pin_d3 = 21;
  cfg.pin_d2 = 19;
  cfg.pin_d1 = 18;
  cfg.pin_d0 = 5;
  cfg.pin_vsync = 25;
  cfg.pin_href = 23;
  cfg.pin_pclk = 22;
  cfg.xclk_freq_hz = 20000000;
  cfg.pixel_format = PIXFORMAT_JPEG;
  cfg.frame_size = FRAMESIZE_QVGA;
  cfg.jpeg_quality = 20;
  cfg.fb_count = 1;
  
  bool camOK = (esp_camera_init(&cfg) == ESP_OK);
  
  // PATTERN: 5 blinks = Camera OK, 10 fast blinks = Camera FAIL
  if (camOK) {
    blink(5, 200, 200);
  } else {
    blink(10, 100, 100);
  }
  delay(500);
  
  // Test 2: WiFi connection
  WiFi.mode(WIFI_STA);
  WiFi.begin("SpectrumSetup-617D", "smoothcurrent945");
  
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    tries++;
  }
  
  bool wifiOK = (WiFi.status() == WL_CONNECTED);
  
  // PATTERN: 2 long blinks = WiFi OK, 5 fast blinks = WiFi FAIL
  if (wifiOK) {
    blink(2, 500, 500);
  } else {
    blink(5, 200, 200);
  }
  delay(1000);
  
  // Test 3: If both OK, try simple ping/UDP
  if (camOK && wifiOK) {
    // Try to send a UDP broadcast
    WiFiUDP udp;
    udp.begin(5556);
    
    int sent = udp.beginPacket("192.168.1.255", 5556);
    if (sent) {
      udp.print("HELLO");
      int result = udp.endPacket();
      
      // PATTERN: 1 long blink = UDP sent OK, 3 blinks = UDP failed
      if (result) {
        blink(1, 1000, 500);
      } else {
        blink(3, 300, 300);
      }
    }
    udp.stop();
  }
  
  delay(2000);
}

void loop() {
  // Keep alive - slow blink
  digitalWrite(LED_GPIO_NUM, LOW);
  delay(100);
  digitalWrite(LED_GPIO_NUM, HIGH);
  delay(2000);
}
