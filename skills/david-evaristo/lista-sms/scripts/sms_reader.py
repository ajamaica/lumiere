import subprocess
import csv
from datetime import datetime
import os


def adb(cmd):
    return subprocess.check_output(
        ["adb", "shell"] + cmd,
        text=True,
        stderr=subprocess.DEVNULL
    )


def validate_sms_row(line):
    """Valida se a linha é uma linha válida de SMS (começa com 'Row')."""
    return line and line.startswith("Row")


def validate_sms_data(data):
    """Valida se os dados do SMS contêm campos obrigatórios."""
    required_fields = ["address", "date", "body"]
    return all(field in data for field in required_fields)


def validate_timestamp(timestamp_str):
    """Valida se o timestamp é válido."""
    try:
        timestamp = int(timestamp_str)
        return timestamp > 0
    except (ValueError, TypeError):
        return False


def parse_row(line):
    if not validate_sms_row(line):
        return {}

    try:
        data = {}

        # Remove "Row: X "
        content = line.split(" ", 2)[2]

        # Campos conhecidos (exceto body)
        known_fields = ["_id", "address", "date", "read", "sub_id"]

        for field in known_fields:
            if f"{field}=" in content:
                part = content.split(f"{field}=", 1)[1]
                value = part.split(", ", 1)[0]
                data[field] = value

        # BODY → pega tudo após "body="
        if "body=" in content:
            data["body"] = content.split("body=", 1)[1]

        if not validate_sms_data(data):
            return {}

        return data

    except Exception:
        return {}


def parse_row_old(line):
    """Extrai dados de uma linha de SMS."""
    if not validate_sms_row(line):
        return {}

    try:
        data = {}
        parts = line.split(" ", 2)
        if len(parts) < 3:
            return {}

        for item in parts[2].split(", "):
            if "=" in item:
                k, v = item.split("=", 1)
                data[k] = v

        # Validar dados extraídos
        if not validate_sms_data(data):
            return {}

        return data
    except Exception:
        return {}


def validate_carrier_name(carrier_part):
    """Valida se o nome da operadora é válido."""
    if not carrier_part:
        return False
    invalid_values = ["<MASKED>", "null", ""]
    return carrier_part not in invalid_values


def validate_phone_id(phone_id):
    """Valida se o phone_id é válido."""
    try:
        phone_id_int = int(phone_id)
        return phone_id_int >= 0
    except (ValueError, TypeError):
        return False


def validate_sub_id(sub_id):
    """Valida se o sub_id é válido."""
    if not sub_id:
        return False
    try:
        sub_id_int = int(sub_id)
        return sub_id_int > 0
    except (ValueError, TypeError):
        return False


def extract_carrier_name(line):
    """Extrai o nome da operadora de uma linha que contém mAlphaLong."""
    try:
        if "mAlphaLong=" not in line:
            return None

        parts = line.split("mAlphaLong=")
        if len(parts) > 1:
            carrier_part = parts[1].split()[0].rstrip(',')
            if validate_carrier_name(carrier_part):
                return carrier_part
    except Exception:
        pass
    return None


def extract_phone_id_from_line(line):
    """Extrai o Phone Id de uma linha que contém 'Phone Id='."""
    try:
        if not line.strip().startswith("Phone Id="):
            return None

        phone_id_str = line.split("Phone Id=")[1].strip()
        phone_id = int(phone_id_str)

        if validate_phone_id(phone_id):
            return phone_id
    except (ValueError, IndexError):
        pass
    return None


def extract_phone_info(output):
    """Extrai informações de cada Phone Id do output."""
    phone_info = {}
    current_phone_id = None

    for line in output.splitlines():
        # Identificar Phone Id
        phone_id = extract_phone_id_from_line(line)
        if phone_id is not None:
            current_phone_id = phone_id
            if current_phone_id not in phone_info:
                phone_info[current_phone_id] = {
                    "carrier": "Desconhecida",
                    "slot": current_phone_id
                }

        # Extrair carrier name de mAlphaLong quando encontrado
        if current_phone_id is not None:
            carrier = extract_carrier_name(line)
            if carrier:
                phone_info[current_phone_id]["carrier"] = carrier

    return phone_info


def extract_subid_phoneid_from_log_line(line):
    """Extrai subId e phoneId de uma linha de log notifyServiceStateForSubscriber."""
    try:
        if "notifyServiceStateForSubscriber:" not in line:
            return None, None

        if "subId=" not in line or "phoneId=" not in line:
            return None, None

        sub_id = None
        phone_id = None

        for part in line.split():
            if part.startswith("subId="):
                sub_id = part.split("=")[1]
            elif part.startswith("phoneId="):
                phone_id_str = part.split("=")[1]
                phone_id = int(phone_id_str)

        if validate_sub_id(sub_id) and validate_phone_id(phone_id):
            return sub_id, phone_id
    except Exception:
        pass

    return None, None


def extract_subid_phoneid_mapping(output, phone_info):
    """Extrai mapeamento de subId para phoneId dos logs."""
    sim_map = {}

    for line in output.splitlines():
        sub_id, phone_id = extract_subid_phoneid_from_log_line(line)

        if sub_id and phone_id is not None:
            slot = phone_id
            carrier = phone_info.get(phone_id, {}).get("carrier", "Desconhecida")

            # Tentar obter carrier do mAlphaLong na mesma linha se disponível
            carrier_from_line = extract_carrier_name(line)
            if carrier_from_line:
                carrier = carrier_from_line

            sim_map[sub_id] = {
                "slot": str(slot),
                "carrier": carrier
            }

    return sim_map


def extract_default_subids(output):
    """Extrai mDefaultSubId e mActiveDataSubId do output."""
    default_sub_id = None
    active_sub_id = None

    for line in output.splitlines():
        if "mDefaultSubId=" in line:
            try:
                default_sub_id = line.split("mDefaultSubId=")[1].strip()
                if not validate_sub_id(default_sub_id):
                    default_sub_id = None
            except Exception:
                pass

        if "mActiveDataSubId=" in line:
            try:
                active_sub_id = line.split("mActiveDataSubId=")[1].strip()
                if not validate_sub_id(active_sub_id):
                    active_sub_id = None
            except Exception:
                pass

    return default_sub_id, active_sub_id


def create_fallback_mapping(phone_info, default_sub_id=None, active_sub_id=None):
    """Cria mapeamento de fallback quando não há mapeamento direto."""
    sim_map = {}

    # Criar lista de subIds para tentar
    sub_ids_to_try = []

    if default_sub_id:
        sub_ids_to_try.append(default_sub_id)
    if active_sub_id and active_sub_id != default_sub_id:
        sub_ids_to_try.append(active_sub_id)

    # Se não encontrou subIds específicos, assumir subId baseado nos phoneIds
    if not sub_ids_to_try:
        for phone_id in sorted(phone_info.keys()):
            sub_ids_to_try.append(str(phone_id + 1))  # subId geralmente é phoneId + 1

    # Criar mapeamento para cada subId
    for sub_id in sub_ids_to_try:
        if not validate_sub_id(sub_id):
            continue

        # Tentar mapear subId para phoneId (geralmente subId 1 = phoneId 0, subId 2 = phoneId 1)
        try:
            phone_id = int(sub_id) - 1
            if phone_id < 0:
                phone_id = 0
        except (ValueError, TypeError):
            phone_id = 0

        sim_map[sub_id] = {
            "slot": str(phone_info.get(phone_id, {}).get("slot", phone_id)),
            "carrier": phone_info.get(phone_id, {}).get("carrier", "Desconhecida")
        }

    return sim_map


def get_sim_map():
    """Obtém o mapeamento de subId para informações do SIM."""
    output = adb(["dumpsys", "telephony.registry"])

    # Extrair informações de cada Phone Id
    phone_info = extract_phone_info(output)

    # Extrair mapeamento de subId para phoneId dos logs
    sim_map = extract_subid_phoneid_mapping(output, phone_info)

    # Se ainda não encontrou nada, usar fallback
    if not sim_map:
        default_sub_id, active_sub_id = extract_default_subids(output)
        sim_map = create_fallback_mapping(phone_info, default_sub_id, active_sub_id)

    return sim_map


def extract_sms_messages(output):
    """Extrai mensagens SMS do output do comando ADB."""
    messages = []

    for line in output.splitlines():
        if validate_sms_row(line):
            sms_data = parse_row(line)
            if sms_data:
                messages.append(sms_data)

    return messages


def get_unread_sms():
    """Obtém lista de SMS não lidos."""
    output = adb([
        "content", "query",
        "--uri", "content://sms/inbox",
        "--projection", "_id,address,date,read,sub_id,body",
        # "--where"
    ])

    return extract_sms_messages(output)


def format_sms_date(timestamp_str):
    """Formata o timestamp para data no formato DD/MM/YYYY."""
    try:
        if not validate_timestamp(timestamp_str):
            return "Data inválida"

        timestamp = int(timestamp_str) / 1000
        return datetime.fromtimestamp(timestamp).strftime("%d/%m/%Y")
    except Exception:
        return "Data inválida"


def get_sim_info(sim_map, sub_id):
    """Obtém informações do SIM baseado no sub_id."""
    if not sub_id:
        return {"slot": "0", "carrier": "Desconhecida"}

    # Tentar encontrar o SIM usando sub_id como string ou int
    sim = sim_map.get(sub_id, {}) or sim_map.get(str(sub_id), {})

    if not sim:
        return {"slot": "0", "carrier": "Desconhecida"}

    return sim


def format_chip_info(sim_info):
    """Formata informações do chip para exibição."""
    try:
        slot = int(sim_info.get('slot', 0)) if sim_info.get('slot') else 0
        carrier = sim_info.get('carrier', 'Desconhecida')
        return f"SIM {slot + 1} ({carrier})"
    except Exception:
        return "SIM Desconhecido"


def print_sms_info(idx, sms, sim_map):
    """Imprime informações formatadas de uma mensagem SMS."""
    data = format_sms_date(sms.get("date", "0"))
    sub_id = sms.get("sub_id")
    sim_info = get_sim_info(sim_map, sub_id)
    chip = format_chip_info(sim_info)

    print("-" * 50)
    print(f"{idx}")
    print(f"Número   : {sms.get('address', 'N/A')}")
    print(f"Data     : {data}")
    print(f"Chip     : {chip}")
    print(f"Mensagem : {sms.get('body', 'N/A')}")


def group_sms_by_sim(sms_list, sim_map):
    """Agrupa SMSs por número do SIM."""
    sim_groups = {}
    
    for sms in sms_list:
        sub_id = sms.get("sub_id")
        sim_info = get_sim_info(sim_map, sub_id)
        slot = int(sim_info.get('slot', 0)) if sim_info.get('slot') else 0
        sim_number = slot + 1
        
        if sim_number not in sim_groups:
            sim_groups[sim_number] = []
        
        sim_groups[sim_number].append(sms)
    
    return sim_groups


def save_sms_to_csv(sms_list, sim_map):
    """Salva lista de SMSs em arquivo CSV."""
    try:
        # Criar diretório de saída se não existir
        output_dir = "/home/evaristo/.openclaw/workspace/skills/lista-sms/output"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Gerar nome do arquivo com data atual
        today = datetime.now().strftime("%Y%m%d-%H%M%S")
        filename = f"{output_dir}/sms_list_{today}.csv"
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['SIM', 'Operadora', 'Número', 'Data', 'Mensagem']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            
            for sms in sms_list:
                sub_id = sms.get("sub_id")
                sim_info = get_sim_info(sim_map, sub_id)
                slot = int(sim_info.get('slot', 0)) if sim_info.get('slot') else 0
                sim_number = slot + 1
                carrier = sim_info.get('carrier', 'Desconhecida')
                data = format_sms_date(sms.get("date", "0"))
                
                writer.writerow({
                    'SIM': f'SIM {sim_number}',
                    'Operadora': carrier,
                    'Número': sms.get('address', 'N/A'),
                    'Data': data,
                    'Mensagem': sms.get('body', 'N/A')
                })
        
        return filename
    except Exception as e:
        print(f"Erro ao salvar CSV: {e}")
        return None


def main():
    sim_map = get_sim_map()
    sms_list = get_unread_sms()
    
    # Agrupar SMSs por SIM
    sim_groups = group_sms_by_sim(sms_list, sim_map)
    
    # Imprimir contagem por SIM
    for sim_number in sorted(sim_groups.keys()):
        count = len(sim_groups[sim_number])
        print(f"SIM {sim_number}: {count} mensagens")
    
    # Salvar em CSV
    csv_filename = save_sms_to_csv(sms_list, sim_map)
    if csv_filename:
        print(f"Arquivo CSV salvo: {csv_filename}")


if __name__ == "__main__":
    main()