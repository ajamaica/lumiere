# TTS через ComfyUI

## Описание

Навык для генерации аудио через ComfyUI с использованием узла `AILab_Qwen3TTSVoiceDesign_Advanced`.

## Требования

- ComfyUI с установленным плагином `AILab_Qwen3TTSVoiceDesign_Advanced`
- Модель Qwen3
- Папка `E:\Ai\Comfy UI\output\` для сохранения аудио

## Запуск ComfyUI

Если ComfyUI не запущена, использовать:

```
cmd /c start "" "C:\Users\user\Desktop\ComfyUI.lnk"
```

## Ожидание готовности

Проверять доступность по `http://localhost:8000` каждые 10 секунд до готовности.

## Формат запроса

```json
{
  "prompt": {
    "50": {
      "inputs": {
        "filename_prefix": "qwen3-tts/[UNIQUE_ID]",
        "quality": "320k",
        "audioUI": "",
        "audio": ["55", 0]
      },
      "class_type": "SaveAudioMP3",
      "_meta": { "title": "Сохранить аудио (MP3)" }
    },
    "55": {
      "inputs": {
        "text": "[TEXT]",
        "instruct": "A male voice with a slightly hoarse, warm tone, speaking in a confident and friendly manner.",
        "model_size": "1.7B",
        "device": "auto",
        "precision": "bf16",
        "language": "Russian",
        "max_new_tokens": 2048,
        "do_sample": true,
        "top_p": 0.9,
        "top_k": 50,
        "temperature": 0.9,
        "repetition_penalty": 1,
        "unload_models": false,
        "seed": -1
      },
      "class_type": "AILab_Qwen3TTSVoiceDesign_Advanced",
      "_meta": { "title": "Qwen3 TTS VoiceDesign (Advanced)" }
    }
  }
}
```

## Обработка

1. Отправить POST-запрос на `http://localhost:8000/prompt`
2. Получить `prompt_id`
3. Ждать завершения в `/history/[prompt_id]`
4. Найти файл в `E:\Ai\Comfy UI\output\[filename_prefix]*.mp3`
5. Отправить как голосовое сообщение через `message(asVoice=true)`
