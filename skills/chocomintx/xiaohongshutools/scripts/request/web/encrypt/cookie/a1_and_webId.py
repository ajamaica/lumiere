import time
import random

from request.web.encrypt.config import xhs_config
from units.fuck_reverse_crypto.hash_functions import crc32_encode, md5_encode

class XHS_A1_And_WebId_Encrypt:
    """小红书 cookie -> a1 & webId 加密实现类
    
    a1: 时间戳 + 随机数 + 对它们的 crc32 验证
    webId: md5(a1)
    """
    
    def __init__(self):
        self.__VALID_CHARS = xhs_config.get("A1_ENCRYPT", "VALID_CHARS")
        self.__TRACE_ID_LENGTH = xhs_config.get("A1_ENCRYPT", "TRACE_ID_LENGTH")
        self.__GET_PLAT_FROM_CODE = xhs_config.get("XHS_VERSION", "GET_PLAT_FROM_CODE")

    def encrypt_cookie_a1_and_webId(self) -> tuple[str, str]:
        """生成 a1 & webId 加密字符串
        
        整个加密过程包括以下步骤：
        1. 取当前时间戳，转换为 16 进制字符串
        2. 从指定字符串随机取 30 个字符
        3. 将时间戳和随机字符串拼接
        4. 计算拼接字符串的 CRC32 值
        5. 将拼接字符串和 CRC32 值拼接，并截取前 52 位
        
        Returns:
            str: 加密后的 cookie -> a1 字符串
            str: 加密后的 cookie -> webId 字符串
        """
        
        hex_data = hex(int(time.time() * 1000))[2:]

        random_string = ''.join(random.choices(self.__VALID_CHARS,  k=self.__TRACE_ID_LENGTH))

        text = (hex_data + random_string + str(self.__GET_PLAT_FROM_CODE) + "0" + "000")

        # CRC32 校验
        crc32 = crc32_encode(text)
        
        a1 = (text + str(crc32))[:52]
        webId = md5_encode(a1)
        return a1, webId