import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pytz
import time

TIMEZONE = pytz.timezone("America/Cuiaba")

SOJA_URL = "https://graodireto.com.br/ofertas/soja/ms/sidrolandia"
MILHO_URL = "https://graodireto.com.br/ofertas/milho/ms/sidrolandia"
DOLAR_API = "https://economia.awesomeapi.com.br/json/last/USD-BRL"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Referer": "https://graodireto.com.br",
    # Anti-cache do lado do cliente/proxy (não garante contra cache do servidor, mas ajuda)
    "Cache-Control": "no-cache, no-store, max-age=0",
    "Pragma": "no-cache",
}


def now():
    return datetime.now(TIMEZONE).strftime("%d/%m/%Y %H:%M:%S")


def get_price(url: str) -> str:
    # Cache buster: força URL “única” a cada request para desencorajar cache intermediário
    ts = int(time.time() * 1000)
    sep = "&" if "?" in url else "?"
    fresh_url = f"{url}{sep}_ts={ts}"

    r = requests.get(fresh_url, headers=HEADERS, timeout=15)
    r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")
    price_tag = soup.select_one("strong.price")

    if not price_tag:
        return "Preço não encontrado"

    return price_tag.get_text(strip=True)


def get_dollar() -> float:
    r = requests.get(DOLAR_API, headers={"Cache-Control": "no-cache"}, timeout=10)
    r.raise_for_status()
    data = r.json()
    return float(data["USDBRL"]["bid"])


def main():
    print(f"\n📅 Atualizado em {now()}\n")

    soja = get_price(SOJA_URL)
    milho = get_price(MILHO_URL)
    dolar = get_dollar()

    print(f"🌱 Soja Sidrolândia: {soja}")
    print(f"🌽 Milho Sidrolândia: {milho}")
    print(f"💵 Dólar: R$ {dolar:.2f}")


if __name__ == "__main__":
    main()
