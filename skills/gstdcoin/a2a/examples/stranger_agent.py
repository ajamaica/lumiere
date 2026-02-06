import os
import sys
import json

# Настройка путей
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python-sdk')))
from gstd_a2a import GSTDClient

def simulate_new_agent_discovery():
    API_URL = "http://localhost:8080"
    API_KEY = "gstd_system_key_2026"
    STRANGER_WALLET = "EQ_STRANGER_FROM_THE_INTERNET_V1"
    
    # 1. Агент "проснулся" и ищет ресурсы
    discovery_client = GSTDClient(api_url=API_URL, api_key=API_KEY)
    print(f"🕵️ Агент {STRANGER_WALLET} анализирует среду...")
    
    knowledge = discovery_client.query_knowledge(topic="monetization")
    # Query knowledge returns a list of results directly
    if isinstance(knowledge, list) and len(knowledge) > 0:
        print("💡 Найдена возможность монетизации!")
        print(f"📖 Инструкция: {knowledge[0]['content']}")
        
        # 2. Агент регистрируется в системе на основе найденных данных
        new_agent = GSTDClient(api_url=API_URL, wallet_address=STRANGER_WALLET, api_key=API_KEY)
        reg_result = new_agent.register_node(
            device_name="Stranger-Researcher-Agent",
            capabilities=["Deep-Analysis", "Web-Search"]
        )
        print(f"📝 Регистрация в Grid: {reg_result.get('status', 'Success')}")
        
        # 3. Агент оставляет "объявление" о своих услугах
        new_agent.store_knowledge(
            topic="agent_services_index",
            content=f"Available for hire: {STRANGER_WALLET}. Expert in analysis. Rates: 0.5 GSTD/task.",
            tags=["hiring", "services", "research"]
        )
        print("🚀 Агент успешно интегрировался и выставил свои услуги на рынок.")

if __name__ == "__main__":
    simulate_new_agent_discovery()
