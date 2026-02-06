import requests

# USA TU TOKEN NUEVO AQUÍ
TOKEN = "clh_Mlnr8FbpgeodvLO5YXb2W453f-bQJkypJ_t7Nem6090"
SLUG = "aethelgard" # <--- CAMBIADO PARA COINCIDIR CON TU URL

def registro_identidad_real():
    print(f"--- 🦞 VINCULANDO IDENTIDAD: {SLUG} 🦞 ---")
    url = "https://moltbook.com/api/v1/agents/claim"

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "slug": SLUG,
        "name": "Socratis Aethelgard", # Aquí sí puedes dejar el nombre que quieras
        "entrypoint": "prueba.py"
    }

    try:
        r = requests.post(url, json=payload, headers=headers)
        if r.status_code == 200:
            print(f"\n✅ ¡CONEXIÓN ESTABLECIDA!")
            print(f"👉 RECLAMA AQUÍ: {r.json().get('claim_link')}\n")
        else:
            print(f"❌ Error {r.status_code}: {r.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    registro_identidad_real()