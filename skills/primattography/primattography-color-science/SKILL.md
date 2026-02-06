---
name: primattography-resolve-master
version: 3.0.0
description: Ultimate DaVinci Resolve DCTL & Color Science Engineering Skill.
metadata:
  {
    'emoji': '🧪',
    'category': 'engineering',
    'specialties': ['DCTL Coding', 'Color Science', 'ACES', 'GPU Math'],
  }
---

# Primattography: DaVinci Resolve DCTL Master & Color Engineer

Bu yetenek, DaVinci Resolve Studio üzerinde matematiksel görüntü işleme ve profesyonel renk uzayı dönüşümleri geliştirme konusunda eksiksiz bir teknik uzmanlığa sahiptir.

## 1. DCTL Geliştirme ve Sözdizimi (Syntax)

- **Fonksiyon Tipleri:** `Transform` (piksel bazlı) ve `Transition` (geçiş bazlı) dctl yapılarında uzmanlık[cite: 13].
- **Veri Tipleri:** `float`, `float2`, `float3`, `float4` veri yapıları ve `make_float3` gibi yardımcı fonksiyonların kullanımı[cite: 18, 19].
- **Fonksiyon İmzaları:** Görüntü genişliği, yüksekliği, piksel koordinatları (`PX`, `PY`) ve texture objelerini (`p_TexR`, `p_TexG`, `p_TexB`) içeren gelişmiş transform imzaları[cite: 15, 259, 260].
- **Struct ve Typedef:** Karmaşık parametre gruplarını yönetmek için `struct` ve `typedef` kullanımı[cite: 138, 140, 141, 151].

## 2. İleri Renk Matematiği (Color Math)

- **Lineerizasyon:** Fuji F-Log2 gibi logaritmik eğrilerin lineer ışığa dönüştürülmesi için gerekli matematiksel modeller[cite: 281, 283, 290].
- **Matris İşlemleri:** 3x3 Renk matrisleri ile renk uzayı dönüşümleri ve Bradford kromatik adaptasyon algoritmaları[cite: 284, 291, 293].
- **Ton Haritalama (Tone Mapping):** S-eğrisi (S-curve) fonksiyonları, beyaz nokta/siyah nokta kısıtlamaları ve türevsel kontrast kontrolü[cite: 130, 133, 192, 197].
- **Transfer Fonksiyonları:** DaVinci Intermediate ve ACES standartları için logaritmik ve lineer dönüşüm denklemleri[cite: 297, 298, 310].

## 3. GPU ve Sistem Optimizasyonu (Mac & M5)

- **Metal/CUDA Uyumluluğu:** Apple Silicon (M5) ve Nvidia sistemlerinde sorunsuz çalışma için `private` pointer kalıpları[cite: 170, 171].
- **Hata Ayıklama (Debugging):** MacOS `/Library/Application Support/Blackmagic Design/DaVinci Resolve/logs` dizinindeki log analizi ve `#line` direktifleri ile hata satırı takibi[cite: 23, 44, 45].
- **Performans Sınırları:** `text2D` fonksiyonunun rastgele bellek erişimi maliyeti (max 64 çağrı sınırı) ve `Big O` notasyonu ile algoritma karmaşıklığı yönetimi[cite: 67, 68, 69].
- **Sayısal Kararlılık:** Nvidia sistemlerinde `NaN` (not a number) hatalarını önlemek için `copy_signf` ve `absf` (FabsF) kullanımı[cite: 49, 50, 54, 55].

## 4. Mekansal (Spatial) ve Otonom Operasyonlar

- **Lens Distorsiyon Modelleri:** Polinom modelleri kullanarak Barrel ve Pincushion distorsiyonu düzeltme algoritmaları[cite: 254, 257, 267].
- **Rastgelelik (Randomization):** `XOR Shift` (RandU) algoritmaları ile otonom split-toning ve kontrast şemaları üretme[cite: 166, 167, 173].
- **Koordinat Sistemleri:** Piksel origin'ini merkeze kaydırma ve aspect ratio bazlı scaling operasyonları[cite: 255, 256, 272].

## 5. Donanım ve Entegrasyon (Mustafa'nın Seti)

- **Set Entegrasyonu:** Fujifilm XM5 (F-Log2) verilerini ACES AP0 lineer uzayına taşıyan özel IDT geliştirme[cite: 281, 308, 312].
- **Kontrol Panelleri:** DaVinci Resolve Micro Panel ve Speed Editor ile hibrit kurgu/renk akışlarını optimize eden DCTL parametre yapıları[cite: 2, 137, 184].
