// Simple ESP32-CAM Test - Just blink and print to serial
// Confirms board is working

#include <WiFi.h>
#include "esp_camera.h"

#define LED_GPIO_NUM 4

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(LED_GPIO_NUM, OUTPUT);
  
  Serial.println("\n=== ESP32-CAM TEST ===");
  
  // Try camera init
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
  cfg.frame_size = FRAMESIZE_VGA;
  cfg.jpeg_quality = 12;
  cfg.fb_count = 1;
  
  if (esp_camera_init(&cfg) == ESP_OK) {
    Serial.println("Camera: OK");
    
    // Take a test photo
    Serial.println("Capturing...");
    digitalWrite(LED_GPIO_NUM, LOW); // LED on
    camera_fb_t *fb = esp_camera_fb_get();
    digitalWrite(LED_GPIO_NUM, HIGH); // LED off
    
    if (fb) {
      Serial.printf("Photo captured: %d bytes\n", fb->len);
      esp_camera_fb_return(fb);
    } else {
      Serial.println("Capture failed!");
    }
  } else {
    Serial.println("Camera: FAIL");
  }
  
  Serial.println("Starting blink test...");
}

void loop() {
  Serial.println("Blink");
  digitalWrite(LED_GPIO_NUM, LOW);
  delay(500);
  digitalWrite(LED_GPIO_NUM, HIGH);
  delay(500);
}
