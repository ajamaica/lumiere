import base64
import requests
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Настройки
CLIENT_ID = input("Введите App ID: ")
CLIENT_SECRET = input("Введите App Secret: ")
REDIRECT_URI = "http://localhost:8080"
SCOPES = "boards:read,boards:write,pins:read,pins:write,user_accounts:read"

class OAuthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = urlparse(self.path).query
        params = parse_qs(query)
        if "code" in params:
            self.server.auth_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("Авторизация прошла успешно! Вы можете закрыть это окно и вернуться в терминал.".encode("utf-8"))
        else:
            self.send_response(400)
            self.end_headers()

def get_token(auth_code):
    url = "https://api.pinterest.com/v5/oauth/token"
    auth_str = f"{CLIENT_ID}:{CLIENT_SECRET}"
    encoded_auth = base64.b64encode(auth_str.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {encoded_auth}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "grant_type": "authorization_code",
        "code": auth_code,
        "redirect_uri": REDIRECT_URI
    }
    
    response = requests.post(url, headers=headers, data=data)
    return response.json()

def main():
    auth_url = (
        f"https://www.pinterest.com/oauth/?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"response_type=code&"
        f"scope={SCOPES}"
    )
    
    print(f"\nОткрываю браузер для авторизации...\nЕсли браузер не открылся, перейдите по ссылке вручную:\n{auth_url}\n")
    webbrowser.open(auth_url)
    
    server = HTTPServer(("localhost", 8080), OAuthHandler)
    server.auth_code = None
    print("Ожидание кода авторизации на http://localhost:8080...")
    server.handle_request()
    
    if server.auth_code:
        print(f"Получен код: {server.auth_code}")
        token_data = get_token(server.auth_code)
        print("\n--- ВАШИ ТОКЕНЫ ---")
        print(f"Access Token: {token_data.get('access_token')}")
        print(f"Refresh Token: {token_data.get('refresh_token')}")
        print(f"Expires In: {token_data.get('expires_in')} секунд")
        print("-------------------\n")
        print("Сохраните эти данные в настройках OpenClaw или используйте их в запросах.")
    else:
        print("Ошибка: Код авторизации не получен.")

if __name__ == "__main__":
    main()
