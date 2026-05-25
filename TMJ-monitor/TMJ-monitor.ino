#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <driver/i2s.h>
#include <WiFiManager.h> 
#include <PubSubClient.h> 
#include <ArduinoJson.h>  
#include <WiFiClientSecure.h>
#include <arduinoFFT.h> 
#include "joint_status_rf_Final.h" 

// ================= CẤU HÌNH PIN CHO ESP32-S3 MINI =================
#define I2S_WS_PIN    10 
#define I2S_SD_PIN    11 
#define I2S_SCK_PIN   12
#define MIC_SEL_PIN   9 
#define I2C_SDA_PIN   4
#define I2C_SCL_PIN   5
#define VIB_MOTOR_PIN 7
#define TOUCH_PIN     8
#define BOOT_BUTTON_PIN 0 

#ifndef RGB_BUILTIN
#define RGB_BUILTIN   48 
#endif

#define I2S_PORT I2S_NUM_0
const uint32_t TOUCH_THRESHOLD = 19000; 

enum State { WIFI_CONNECTING, IDLE, PREPARING, MEASURING, FINISHED };
State currentState = WIFI_CONNECTING;

const String DEVICE_ID = "DEV-001";
const String FULL_DEVICE_ID = DEVICE_ID + "-000000";

String dataTopic   = "joint_monitor/" + FULL_DEVICE_ID + "/data";
String statusTopic = "joint_monitor/" + FULL_DEVICE_ID + "/status"; 
String lockTopic   = "joint_monitor/" + FULL_DEVICE_ID + "/lock";   
String camTopic    = "joint_monitor/" + FULL_DEVICE_ID + "/request_cam";

const char* mqtt_server = "8b0913889a6742eb9501c5caf1b137eb.s1.eu.hivemq.cloud";

Adafruit_MPU6050 mpu;
WiFiClientSecure espClient; 
PubSubClient client(espClient);

unsigned long touchStartTime = 0, lastMqttSend = 0;
float filtered_angle = 0, current_rms = 0;
int last_stable_ai = 0, history_idx = 0, ai_history[7] = {0};

#define SAMPLE_COUNT 128
int32_t i2s_samples[SAMPLE_COUNT];
double vReal[SAMPLE_COUNT]; 
double vImag[SAMPLE_COUNT]; 

ArduinoFFT<double> FFT = ArduinoFFT<double>(vReal, vImag, SAMPLE_COUNT, 16000.0);

void setLED(int r, int g, int b) { neopixelWrite(RGB_BUILTIN, r, g, b); }

void vibrate(int times, int duration = 150) {
  for (int i = 0; i < times; i++) {
    analogWrite(VIB_MOTOR_PIN, 160); delay(duration);
    analogWrite(VIB_MOTOR_PIN, 0); if (i < times - 1) delay(150);
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) msg += (char)payload[i];
  if (String(topic) == camTopic && msg == "START_CAM") {
    vibrate(2, 100); setLED(0, 0, 255); 
  }
}

void setup_mqtt() {
  if (!client.connected()) {
    if (client.connect(FULL_DEVICE_ID.c_str(), "MiceBach", "Kneejoint1@", statusTopic.c_str(), 1, true, "OFFLINE")) {
      client.publish(statusTopic.c_str(), "ONLINE", true);
      client.publish(lockTopic.c_str(), "FREE", true); 
      client.subscribe(camTopic.c_str());
      client.setCallback(callback);
    }
  }
}

void setup() {
  Serial.begin(921600);
  pinMode(VIB_MOTOR_PIN, OUTPUT);
  pinMode(MIC_SEL_PIN, OUTPUT);
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(MIC_SEL_PIN, LOW);

  WiFiManager wm;
  
  // --- THAY ĐỔI: ÉP BUỘC RESET VÀ CÀI ĐẶT WIFI MỖI KHI MỞ MÁY (ON) ---
  wm.resetSettings(); // Xóa bộ nhớ cũ ngay khi khởi động
  setLED(0, 0, 200);  // Sáng LED xanh dương báo đang chờ cài đặt mạng
  
  if (!wm.startConfigPortal("TMJ_S3_Mini_Setup")) {
    Serial.println("Cài đặt WiFi thất bại!");
    ESP.restart();
  }
  
  setLED(0, 255, 0); // Xanh lá báo đã kết nối thành công
  delay(1000);
  setLED(0, 0, 0);

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  mpu.begin();
  
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000, .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT, .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .dma_buf_count = 8, .dma_buf_len = SAMPLE_COUNT
  };
  i2s_pin_config_t pin_config = { .bck_io_num = 12, .ws_io_num = 10, .data_out_num = -1, .data_in_num = 11 };
  i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &pin_config);

  espClient.setInsecure();
  client.setServer(mqtt_server, 8883);
  currentState = IDLE;
}

void loop() {
  setup_mqtt();
  client.loop();

  uint32_t touchVal = touchRead(TOUCH_PIN);
  bool isTouched = (touchVal > TOUCH_THRESHOLD);

  switch (currentState) {
    case IDLE:
      if (isTouched) { vibrate(1); touchStartTime = millis(); currentState = PREPARING; }
      break;
    case PREPARING:
      if (!isTouched) currentState = IDLE;
      else if (millis() - touchStartTime > 1000) { vibrate(2); setLED(255, 255, 0); currentState = MEASURING; }
      break;
    case MEASURING:
      if (!isTouched) currentState = FINISHED;
      else {
        handleMeasurement();
        if (millis() - lastMqttSend > 50) { lastMqttSend = millis(); sendMqttData("active"); }
      }
      break;
    case FINISHED:
      sendMqttData("end"); 
      setLED(0, 0, 0); 
      vibrate(1, 300); 
      // Khi ngắt nguồn hoặc kết thúc, thiết bị đã được "wipe" sẵn từ lúc setup
      currentState = IDLE;
      break;
  }
}

void handleMeasurement() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float raw_angle = atan2(-a.acceleration.x, sqrt(a.acceleration.y * a.acceleration.y + a.acceleration.z * a.acceleration.z)) * 180.0 / PI;
  filtered_angle = (0.2 * raw_angle) + (0.8 * filtered_angle);

  size_t bytes_read;
  i2s_read(I2S_NUM_0, &i2s_samples, sizeof(i2s_samples), &bytes_read, 0);
  int n = bytes_read / 4;
  
  if (n > 0) {
    float sum = 0, sq = 0, zcr = 0, max_amp = 0;

    for (int i = 0; i < n; i++) sum += (float)(i2s_samples[i] >> 14);
    float mean = sum / n;
    
    for (int i = 0; i < n; i++) {
      float val = ((float)(i2s_samples[i] >> 14)) - mean; 
      sq += val * val;
      if (abs(val) > max_amp) max_amp = abs(val); 

      if (i > 0) {
        float prev = ((float)(i2s_samples[i-1] >> 14)) - mean;
        if ((val > 0 && prev < 0) || (val < 0 && prev > 0)) zcr++;
      }
      vReal[i] = (double)val;
      vImag[i] = 0.0;
    }
    
    current_rms = sqrt(sq / n); 
    float raw_zcr = zcr / (float)n; 

    if (current_rms < 150) { 
      last_stable_ai = 0; 
    } 
    else {
      FFT.windowing(FFTWindow::Hamming, FFTDirection::Forward);
      FFT.compute(FFTDirection::Forward);
      FFT.complexToMagnitude();

      double peakFreq = FFT.majorPeak(); 
      float spectral_centroid = 0, sum_mags = 0, sum_freq_mags = 0;

      for (int i = 1; i < (n / 2); i++) {
          float freq = (i * 16000.0) / n;
          sum_mags += (float)vReal[i];
          sum_freq_mags += (freq * (float)vReal[i]);
      }
      if (sum_mags > 0) spectral_centroid = sum_freq_mags / sum_mags;

      // ==========================================
      // THAY ĐỔI: CHUẨN HÓA VÀ NHÂN HỆ SỐ TĂNG ĐỘ NHẠY
      // ==========================================
      int16_t mapped_rms = (int16_t)((current_rms / 32768.0) * 1000.0); // Khớp hệ quy chiếu Colab
      int16_t mapped_zcr = (int16_t)(raw_zcr * 1000.0);               // Khớp hệ quy chiếu Colab
      int16_t mapped_amp = (int16_t)((max_amp / 1000.0) * 100.0);      // Khớp hệ quy chiếu Colab

      int16_t f[7] = { 
        (int16_t)peakFreq,                   
        (int16_t)(peakFreq * 0.9f),          
        (int16_t)spectral_centroid,          
        mapped_rms,                          
        (int16_t)(sum_mags / (n/2)),         
        mapped_zcr,                          
        mapped_amp                           
      };

      int res = (int)joint_status_rf_predict(f, 7);
      
      ai_history[history_idx] = res; 
      history_idx = (history_idx + 1) % 7;
      
      int c[4] = {0, 0, 0, 0}; 
      for(int i=0; i<7; i++) c[ai_history[i]]++;
      
      if(c[3] >= 3) last_stable_ai = 3; 
      else if(c[2] >= 3) last_stable_ai = 2; 
      else if(c[1] >= 4) last_stable_ai = 1; 
      else last_stable_ai = 0;
    }
  }
}

void sendMqttData(String s) {
  StaticJsonDocument<256> doc;
  doc["device"] = DEVICE_ID; 
  doc["angle"] = round(filtered_angle * 10.0) / 10.0;
  doc["audio"] = round(current_rms * 0.1 * 10.0) / 10.0; 
  doc["ai_status"] = last_stable_ai; 
  doc["session"] = s; 
  char buf[256]; serializeJson(doc, buf); client.publish(dataTopic.c_str(), buf);
}