#!/usr/bin/env python3
"""
HomeKit 智能家居控制器
支持：设备发现、状态查询、开关控制、场景触发
"""

import json
import sys
import os
import asyncio
import argparse
from typing import Optional, Dict, List

# 尝试导入 HAP-Python
# 注意：这需要设备已经通过 HomeKit 配对
try:
    from homekit import Controller, find_device_ip_and_port
    from homekit.exceptions import AccessoryNotFoundError, IncorrectPairingIdError
    HOMEKIT_AVAILABLE = True
except ImportError:
    HOMEKIT_AVAILABLE = False
    print("⚠️  homekit 库未安装，请先运行: pip3 install HAP-python homekit[IP]")

# 配置存储路径
CONFIG_DIR = os.path.expanduser("~/.config/homekit")
PAIRING_FILE = os.path.join(CONFIG_DIR, "pairings.json")

def ensure_config_dir():
    """确保配置目录存在"""
    os.makedirs(CONFIG_DIR, exist_ok=True)

def load_config():
    """加载配置"""
    config = {
        'default_home': os.getenv('HOMEKIT_DEFAULT_HOME', 'default'),
    }
    return config

def get_controller():
    """获取 HomeKit 控制器"""
    if not HOMEKIT_AVAILABLE:
        return None
    
    ensure_config_dir()
    controller = Controller()
    
    # 加载已有配对
    if os.path.exists(PAIRING_FILE):
        controller.load_data(PAIRING_FILE)
    
    return controller

def list_devices(controller: Controller) -> List[Dict]:
    """列出所有已配对设备"""
    devices = []
    
    for alias in controller.get_pairings():
        try:
            pairing = controller.get_pairings()[alias]
            accessories = pairing.list_accessories_and_characteristics()
            
            for accessory in accessories:
                aid = accessory['aid']
                services = accessory.get('services', [])
                
                for service in services:
                    s_type = service.get('type', '')
                    chars = service.get('characteristics', [])
                    
                    device_info = {
                        'alias': alias,
                        'aid': aid,
                        'service_type': s_type,
                        'name': 'Unknown',
                        'status': 'unknown'
                    }
                    
                    for char in chars:
                        c_type = char.get('type', '')
                        if 'Name' in c_type:
                            device_info['name'] = char.get('value', 'Unknown')
                        elif 'On' in c_type:
                            device_info['status'] = 'on' if char.get('value') else 'off'
                        elif 'Brightness' in c_type:
                            device_info['brightness'] = char.get('value', 0)
                        elif 'CurrentTemperature' in c_type:
                            device_info['temperature'] = char.get('value', 0)
                    
                    if s_type in ['Lightbulb', 'Switch', 'Outlet', 'Thermostat', 'Fan']:
                        devices.append(device_info)
                        
        except Exception as e:
            print(f"⚠️  读取设备 {alias} 失败: {e}")
    
    return devices

def control_device(controller: Controller, alias: str, aid: int, characteristic: str, value):
    """控制设备"""
    try:
        pairing = controller.get_pairings()[alias]
        
        # 构建控制命令
        changes = [{
            'aid': aid,
            'iid': get_characteristic_iid(controller, alias, aid, characteristic),
            'value': value
        }]
        
        pairing.put_characteristics(changes)
        return True
    except Exception as e:
        print(f"❌ 控制设备失败: {e}")
        return False

def get_characteristic_iid(controller: Controller, alias: str, aid: int, char_type: str) -> int:
    """获取特性 ID"""
    pairing = controller.get_pairings()[alias]
    accessories = pairing.list_accessories_and_characteristics()
    
    for accessory in accessories:
        if accessory['aid'] == aid:
            for service in accessory.get('services', []):
                for char in service.get('characteristics', []):
                    if char_type in char.get('type', ''):
                        return char['iid']
    return 0

def get_device_status(controller: Controller, alias: str, aid: int) -> Dict:
    """获取设备状态"""
    try:
        pairing = controller.get_pairings()[alias]
        accessories = pairing.list_accessories_and_characteristics()
        
        for accessory in accessories:
            if accessory['aid'] == aid:
                return {
                    'aid': aid,
                    'services': accessory.get('services', [])
                }
        
        return {}
    except Exception as e:
        print(f"❌ 获取状态失败: {e}")
        return {}

def discover_devices(timeout: int = 5) -> List[Dict]:
    """发现未配对设备"""
    if not HOMEKIT_AVAILABLE:
        return []
    
    print(f"🔍 正在发现 HomeKit 设备 ({timeout}秒)...")
    
    try:
        from homekit.zeroconf_impl import ZeroconfController
        
        controller = ZeroconfController()
        devices = controller.discover(timeout)
        
        results = []
        for device in devices:
            results.append({
                'name': device.get('name', 'Unknown'),
                'model': device.get('model', 'Unknown'),
                'address': device.get('address', 'Unknown'),
                'port': device.get('port', 0),
                'category': device.get('category', 'Unknown')
            })
        
        return results
    except Exception as e:
        print(f"⚠️  设备发现失败: {e}")
        return []

def pair_device(controller: Controller, device_id: str, pin: str, alias: str):
    """配对设备"""
    try:
        print(f"🔗 正在配对设备: {alias}")
        
        # 查找设备
        from homekit.zeroconf_impl import ZeroconfController
        zc = ZeroconfController()
        devices = zc.discover(3)
        
        target_device = None
        for device in devices:
            if device_id in device.get('name', '') or device_id in device.get('address', ''):
                target_device = device
                break
        
        if not target_device:
            print(f"❌ 未找到设备: {device_id}")
            return False
        
        # 执行配对
        pairing = controller.perform_pairing(
            alias,
            target_device['name'],
            pin,
            target_device['address'],
            target_device['port']
        )
        
        # 保存配对信息
        controller.save_data(PAIRING_FILE)
        
        print(f"✅ 配对成功: {alias}")
        return True
        
    except Exception as e:
        print(f"❌ 配对失败: {e}")
        return False

def unpair_device(controller: Controller, alias: str):
    """取消配对"""
    try:
        controller.remove_pairing(alias)
        controller.save_data(PAIRING_FILE)
        print(f"✅ 已取消配对: {alias}")
        return True
    except Exception as e:
        print(f"❌ 取消配对失败: {e}")
        return False

def print_device_list(devices: List[Dict]):
    """打印设备列表"""
    if not devices:
        print("📭 没有找到设备")
        return
    
    print(f"\n📱 找到 {len(devices)} 个设备:\n")
    print(f"{'Alias':<15} {'Name':<25} {'Type':<15} {'Status':<10}")
    print("-" * 70)
    
    for device in devices:
        alias = device.get('alias', 'N/A')[:14]
        name = device.get('name', 'Unknown')[:24]
        dtype = device.get('service_type', 'Unknown')[:14]
        status = device.get('status', 'unknown')
        
        # 添加额外信息
        extra = []
        if 'brightness' in device:
            extra.append(f"{device['brightness']}%")
        if 'temperature' in device:
            extra.append(f"{device['temperature']}°C")
        
        extra_str = f" ({', '.join(extra)})" if extra else ""
        
        icon = "💡" if dtype == "Lightbulb" else "🔌" if dtype == "Outlet" else "🔲"
        print(f"{icon} {alias:<15} {name:<25} {dtype:<15} {status:<10}{extra_str}")

def main():
    parser = argparse.ArgumentParser(description='HomeKit 智能家居控制器')
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # list 命令
    list_parser = subparsers.add_parser('list', help='列出已配对设备')
    
    # discover 命令
    discover_parser = subparsers.add_parser('discover', help='发现新设备')
    discover_parser.add_argument('--timeout', '-t', type=int, default=5, help='发现超时时间(秒)')
    
    # pair 命令
    pair_parser = subparsers.add_parser('pair', help='配对设备')
    pair_parser.add_argument('device_id', help='设备ID或名称')
    pair_parser.add_argument('pin', help='配对码 (格式: XXX-XX-XXX)')
    pair_parser.add_argument('alias', help='设备别名')
    
    # unpair 命令
    unpair_parser = subparsers.add_parser('unpair', help='取消配对')
    unpair_parser.add_argument('alias', help='设备别名')
    
    # on 命令
    on_parser = subparsers.add_parser('on', help='打开设备')
    on_parser.add_argument('alias', help='设备别名')
    on_parser.add_argument('--aid', type=int, default=1, help='Accessory ID')
    
    # off 命令
    off_parser = subparsers.add_parser('off', help='关闭设备')
    off_parser.add_argument('alias', help='设备别名')
    off_parser.add_argument('--aid', type=int, default=1, help='Accessory ID')
    
    # status 命令
    status_parser = subparsers.add_parser('status', help='获取设备状态')
    status_parser.add_argument('alias', help='设备别名')
    status_parser.add_argument('--aid', type=int, default=1, help='Accessory ID')
    
    # brightness 命令
    bright_parser = subparsers.add_parser('brightness', help='设置亮度 (0-100)')
    bright_parser.add_argument('alias', help='设备别名')
    bright_parser.add_argument('level', type=int, help='亮度级别 (0-100)')
    bright_parser.add_argument('--aid', type=int, default=1, help='Accessory ID')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if not HOMEKIT_AVAILABLE:
        print("\n❌ 请先安装依赖:")
        print("   pip3 install HAP-python homekit[IP] --user")
        return
    
    controller = get_controller()
    
    if args.command == 'list':
        devices = list_devices(controller)
        print_device_list(devices)
    
    elif args.command == 'discover':
        devices = discover_devices(args.timeout)
        if devices:
            print(f"\n🔍 发现 {len(devices)} 个未配对设备:\n")
            for i, device in enumerate(devices, 1):
                print(f"{i}. {device['name']}")
                print(f"   型号: {device['model']}")
                print(f"   地址: {device['address']}:{device['port']}")
                print(f"   类别: {device['category']}")
                print()
    
    elif args.command == 'pair':
        pair_device(controller, args.device_id, args.pin, args.alias)
    
    elif args.command == 'unpair':
        unpair_device(controller, args.alias)
    
    elif args.command == 'on':
        if control_device(controller, args.alias, args.aid, 'On', True):
            print(f"✅ {args.alias} 已打开")
    
    elif args.command == 'off':
        if control_device(controller, args.alias, args.aid, 'On', False):
            print(f"✅ {args.alias} 已关闭")
    
    elif args.command == 'status':
        status = get_device_status(controller, args.alias, args.aid)
        print(json.dumps(status, indent=2, ensure_ascii=False))
    
    elif args.command == 'brightness':
        level = max(0, min(100, args.level))
        if control_device(controller, args.alias, args.aid, 'Brightness', level):
            print(f"✅ {args.alias} 亮度已设置为 {level}%")

if __name__ == '__main__':
    main()
