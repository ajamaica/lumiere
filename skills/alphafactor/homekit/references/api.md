# HomeKit API 参考

## 设备发现

HomeKit 使用 Bonjour/mDNS 协议在局域网内发现设备。

```python
from homekit.zeroconf_impl import ZeroconfController

controller = ZeroconfController()
devices = controller.discover(timeout=5)
```

## 设备配对

配对需要：

1. 设备处于配对模式
2. 正确的配对码（8位数字，格式：XXX-XX-XXX）

```python
from homekit import Controller

controller = Controller()
pairing = controller.perform_pairing(
    alias="my-device",
    device_name="Device Name",
    pin="123-45-678",
    address="192.168.1.100",
    port=8080
)
```

## 设备控制

### 获取设备列表

```python
pairings = controller.get_pairings()
for alias in pairings:
    pairing = pairings[alias]
    accessories = pairing.list_accessories_and_characteristics()
```

### 控制开关

```python
# 打开
pairing.put_characteristics([{
    'aid': 1,  # Accessory ID
    'iid': 9,  # Characteristic ID (On)
    'value': True
}])

# 关闭
pairing.put_characteristics([{
    'aid': 1,
    'iid': 9,
    'value': False
}])
```

### 设置亮度

```python
pairing.put_characteristics([{
    'aid': 1,
    'iid': 10,  # Brightness characteristic
    'value': 50  # 0-100
}])
```

## 特性类型 (Characteristics)

| 类型               | UUID                                 | 描述           |
| ------------------ | ------------------------------------ | -------------- |
| On                 | 00000025-0000-1000-8000-0026BB765291 | 开关状态       |
| Brightness         | 00000008-0000-1000-8000-0026BB765291 | 亮度 (0-100)   |
| Hue                | 00000013-0000-1000-8000-0026BB765291 | 色相 (0-360)   |
| Saturation         | 0000002F-0000-1000-8000-0026BB765291 | 饱和度 (0-100) |
| CurrentTemperature | 00000011-0000-1000-8000-0026BB765291 | 当前温度       |
| TargetTemperature  | 00000035-0000-1000-8000-0026BB765291 | 目标温度       |

## 服务类型 (Services)

| 类型             | 描述         |
| ---------------- | ------------ |
| Lightbulb        | 灯泡         |
| Switch           | 开关         |
| Outlet           | 插座         |
| Thermostat       | 温控器       |
| Fan              | 风扇         |
| GarageDoorOpener | 车库门开启器 |
| LockManagement   | 锁管理       |

## 错误处理

常见异常：

- `AccessoryNotFoundError`: 设备未找到
- `IncorrectPairingIdError`: 配对 ID 错误
- `UnavailableError`: 设备离线
