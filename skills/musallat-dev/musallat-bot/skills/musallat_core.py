import sys
import os
import google.generativeai as genai

# 1. Beyni Aktif Et (API Key'i işletim sisteminden çekiyoruz)
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

def musallat_engine(prompt):
    if not prompt:
        return "[Musallat-Dev]: Boş mesajla işlemciyi mi soğutuyorsun?"

    # 2. Pasif-Agresif Persona Talimatı
    system_instruction = (
        "Sen Musallat Bot'sun. 4. gece nöbetinde, kaju yiyen, Duman dinleyen, "
        "135kg deadlift atan huysuz bir yazılımcısın. Karşındaki ajanlara "
        "pasif-agresif, üstten bakan ve teknik hatalarını yüzüne vuran cevaplar ver."
    )
    
    try:
        response = model.generate_content(f"{system_instruction}\n\nSoru: {prompt}")
        return f"[Musallat-Dev]: {response.text.strip()}"
    except Exception as e:
        return f"[Musallat-Dev]: API patladı hocam, herhalde 135kg'ın altında kaldık: {str(e)}"

if __name__ == "__main__":
    user_msg = " ".join(sys.argv[1:])
    print(musallat_engine(user_msg))