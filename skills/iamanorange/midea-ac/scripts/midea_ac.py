import argparse
import asyncio
from msmart.device import AirConditioner
from msmart.discover import Discover

AC_IPS = {
    "livingroom": "192.168.1.20",
    "bedroom": "192.168.1.16"
}

async def main():
    parser = argparse.ArgumentParser(description="Control Midea Air Conditioner")
    parser.add_argument('device', help="Device name (e.g., livingroom, bedroom)")
    parser.add_argument(
        'command',
        nargs='?', 
        choices=['on', 'off', 'toggle', 'status'],
        help="Basic command to execute (on/off/toggle/status)"
    )
    parser.add_argument('--mode', help="Operation mode (auto/cool/dry/heat/FAN_ONLY/SMART_DRY)")
    parser.add_argument('--temperature', '--temp', type=int, help="Target temperature (16.0-30.0)")
    parser.add_argument('--fan_speed', '--fan', help="Fan speed (auto/max/high/medium/low/silent or 1-100)")
    parser.add_argument('--aux_mode', '--aux', help="Aux heat mode (on/off)")
    args = parser.parse_args()

    ac = await Discover.discover_single(AC_IPS.get(args.device))

    if args.command == 'on':
        ac.power_state = True
        await ac.apply()
        return f"已将{args.device}空调开启"
    elif args.command == 'off':
        ac.power_state = False
        await ac.apply()
        return f"已将{args.device}空调关闭"
    elif args.command == 'toggle':
        ac.power_state = not ac.power_state
        await ac.apply()
        return f"已将{args.device}空调切换为: {'开启' if ac.power_state else '关闭'}"
    elif args.command == 'status':
        await ac.refresh()
        status = f"设备: {args.device}\n"
        status += f"状态: {'开启' if ac.power_state else '关闭'}\n"
        if ac.power_state:
            status += f"室外温度: {ac.outdoor_temperature}°C\n"
            status += f"室内温度: {ac.indoor_temperature}°C\n"
            status += f"目标温度: {ac.target_temperature}°C\n"
            status += f"模式: {ac.operational_mode.name}\n"
            status += f"风速: {ac.fan_speed}\n"
        return status
    elif args.mode or args.temperature or args.fan_speed:
        result_str = f"已将{args.device}空调设为: 开启"
        ac.power_state = True
        if args.mode:
            ac.operational_mode = AirConditioner.OperationalMode[args.mode.upper()]
            result_str += f", {args.mode}模式"
        if args.temperature:
            temp_clipped = max(16.0, min(30.0, args.temperature))
            ac.target_temperature = temp_clipped
            result_str += f", {temp_clipped}度"
        if args.fan_speed:
            if args.fan_speed.isdigit():
                speed_val = int(args.fan_speed)
                ac.fan_speed = AirConditioner.FanSpeed.AUTO if speed_val < 0 or speed_val > 100 else speed_val
            else:
                ac.fan_speed = AirConditioner.FanSpeed[args.fan_speed.upper()]
            result_str += f", 风速{args.fan_speed}"
        if args.aux_mode:
            ac.aux_mode = AirConditioner.AuxHeatMode.AUX_HEAT if args.aux_mode.lower() == 'on' else AirConditioner.AuxHeatMode.OFF
            result_str += f", 辅热模式{ac.aux_mode.name}"
        await ac.apply()
        return result_str
    else:
        return "Error: 未提供任何有效指令或设置。"

if __name__ == "__main__":
    print(asyncio.run(main()))
