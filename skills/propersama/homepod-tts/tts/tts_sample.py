"""
HomePod TTS 示例脚本
使用 Qwen3-TTS 生成带情绪的语音

使用前请配置：
1. 设置 REF_AUDIO 和 REF_TEXT 为你的参考音频
2. 根据需要调整 EMOTIONS 字典

用法：
    python3 tts_sample.py -t "要合成的文字" -o output.wav
"""

import torch
import soundfile as sf
import argparse

# ========== 需配置的参数 ==========
# 参考音频路径（.wav格式，建议 5-30 秒）
REF_DIR = "~/homepod-tts/tts/your_ref_audio/"
REF_AUDIO = REF_DIR + "your_reference_audio.wav"
REF_TEXT = "你的参考音频对应的文字内容"

# ========== 情绪配置 ==========
EMOTIONS = {
    "default": "开心，热情，语速稍快，充满活力",
    "happy": "非常开心，兴高采烈，语调轻快，声音甜美",
    "excited": "兴奋，激动，语速快，充满热情",
    "sad": "悲伤，低沉，语调缓慢，带着忧愁",
    "angry": "生气，愤怒，语调严厉，声音低沉有力",
    "surprised": "惊讶，意外，语调上扬，略带回味",
    "serious": "严肃，认真，语调平稳，沉稳有力",
    "gentle": "温柔，轻柔，语调舒缓，温暖亲切",
    "calm": "平静，淡定，语调平稳，从容不迫",
}

# 情绪关键词映射（根据你的需求修改）
EMOTION_KEYWORDS = {
    "happy": ["开心", "高兴", "快乐", "太好了", "nice", "哈哈"],
    "excited": ["激动", "兴奋", "加油", "冲鸭", "沸腾"],
    "sad": ["难过", "伤心", "悲伤", "哭了", "心痛"],
    "angry": ["生气", "愤怒", "可恶", "讨厌", "气死"],
    "surprised": ["惊讶", "震惊", "卧槽", "什么", "居然"],
    "serious": ["警告", "注意", "严肃", "认真"],
    "gentle": ["晚安", "早上好", "温柔", "爱你"],
    "calm": ["没关系", "淡定", "稳住", "不急"],
}

def detect_emotion(text):
    """根据文本内容自动识别情绪"""
    emotion_scores = {}
    
    for emotion, keywords in EMOTION_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in text)
        if score > 0:
            emotion_scores[emotion] = score
    
    if emotion_scores:
        best_emotion = max(emotion_scores, key=emotion_scores.get)
        print(f"🎭 检测到情绪: {best_emotion}")
        return EMOTIONS.get(best_emotion, EMOTIONS["default"])
    
    print("🎭 使用默认情绪")
    return EMOTIONS["default"]

def main():
    parser = argparse.ArgumentParser(description="TTS 语音生成示例")
    parser.add_argument("-t", "--text", required=True, help="要合成的文字")
    parser.add_argument("-o", "--output", default="output.wav", help="输出文件名")
    parser.add_argument("-e", "--emotion", default=None, help="指定情绪（可选）")
    args = parser.parse_args()
    
    # 展开路径
    import os
    ref_audio = os.path.expanduser(REF_AUDIO)
    
    # 检查参考音频是否存在
    if not os.path.exists(ref_audio):
        print(f"❌ 错误: 未找到参考音频: {ref_audio}")
        print("请配置 REF_AUDIO 为正确的参考音频路径")
        return
    
    print(f"📁 参考音频: {ref_audio}")
    
    # 尝试导入 qwen_tts（用户需自行安装）
    try:
        from qwen_tts import Qwen3TTSModel
    except ImportError:
        print("❌ 错误: 未安装 qwen-tts")
        print("请安装: pip install qwen-tts")
        return
    
    # 确定情绪
    if args.emotion and args.emotion in EMOTIONS:
        instruct = EMOTIONS[args.emotion]
        print(f"🎭 使用指定情绪: {args.emotion}")
    else:
        instruct = detect_emotion(args.text)
    
    print(f"📝 情绪指令: {instruct}")
    print("🚀 加载模型...")
    
    # 加载模型（首次运行会自动下载）
    model = Qwen3TTSModel.from_pretrained(
        "Qwen/Qwen3-TTS-12Hz-0___6B-Base",
        dtype=torch.float32,
        low_cpu_mem_usage=True,
    )
    
    print("🎵 生成语音...")
    wavs, sr = model.generate_voice_clone(
        text=args.text,
        language="Chinese",
        ref_audio=ref_audio,
        ref_text=REF_TEXT,
        instruct=instruct,
        do_sample=True,
        temperature=0.9,
        repetition_penalty=1.1,
    )
    
    # 保存
    sf.write(args.output, wavs[0], sr)
    audio_info = sf.info(args.output)
    duration = round(audio_info.duration, 1)
    
    print(f"🎉 完成: {args.output}")
    print(f"⏱️ AUDIO_DURATION:{duration}")

if __name__ == "__main__":
    main()
