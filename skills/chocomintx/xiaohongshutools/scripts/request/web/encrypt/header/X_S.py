import hashlib
import json
import random
import time
import urllib.parse
from request.web.encrypt.config import xhs_config
from request.web.encrypt.xhs_diy_encode import encode_utf8, b64_encode


class XHS_XS_Encrypt:
    """
    小红书XS加密实现类
    
    用于生成小红书API请求所需的X-S加密头。
    加密过程包括：MD5哈希、Base64编码和AES加密等多个步骤。  
    """
    
    def __init__(self):
        """初始化加密器，从配置文件读取必要的加密参数
        """
        # 加载其他加密参数
        self.__appID = xhs_config.get('XHS_VERSION', 'APP_ID')
        self.__base58_table = xhs_config.get('XS_ENCRYPT', 'BASE58_TABLE')
        self.__os_system = xhs_config.get('XHS_VERSION', 'OS_SYSTEM')
        self.__language_version = xhs_config.get('XHS_VERSION', 'LANGUAGE_VERSION')
        self.__base64_table = xhs_config.get('XHS_VERSION', 'BASE64_TABLE')
        self.__xorkey = xhs_config.get('XS_ENCRYPT', 'XOR_KEY')

    def __base58_encode(self, data):
        num = int.from_bytes(data, byteorder='big')
        
        encoded = []
        while num > 0:
            num, remainder = divmod(num, 58)
            encoded.append(self.__base58_table[remainder])
        
        # 处理前导零字节
        leading_zeros = len(data) - len(data.lstrip(b'\x00'))
        encoded.extend([self.__base58_table[0]] * leading_zeros)
        
        return ''.join(reversed(encoded))

    def __encrypt_headers_x3(self, cookie_a1: str, cookie_loadts: int, uri: str="", params: dict = None, data: dict = None) -> str:

        if params:
            query_string = urllib.parse.urlencode(params).replace('%2C', ',')
            uri = f"{uri}?{query_string}"
        
        if data is not None:
            data_str = json.dumps(data, separators=(",", ":"))
            uri = uri + data_str


        # 计算md5
        md5_url = hashlib.md5(uri.encode()).hexdigest()

        encrypt_part1_4 = [119, 104, 96, 41]

        random_num = int(random.random() * 4294967295)
        encrypt_part2_4 = list(random_num.to_bytes(4, byteorder='little'))

        timestamp = int(time.time() * 1000)
        byte_list = list(timestamp.to_bytes(8, byteorder='little'))
        byte_list[0] = (sum(byte_list[1:5]) & 255) + sum(byte_list[5:8]) & 0xFF
        encrypt_part3_8 = [i^41 for i in byte_list]

        encrypt_part4_8 = list(cookie_loadts.to_bytes(8, byteorder='little'))
        # print(encrypt_part4_8)
        # 随机值1-99
        num = int(random.random() * 99) + 1
        encrypt_part5_4 = list(num.to_bytes(4, byteorder='little'))

        # Object.getOwnPropertyNames(window) # window对象属性数量
        num = 1293 
        encrypt_part6_4 = list(num.to_bytes(4, byteorder='little'))

        # 拼接后uri的长度
        num = len(uri.encode("utf-8"))
        encrypt_part7_4 = list(num.to_bytes(4, byteorder='little'))

        encrypt_part8_8 = [b ^ (random_num & 255) for b in bytes.fromhex(md5_url)][0:8]

        byte_array = list(cookie_a1.encode('utf-8'))
        encrypt_part9_53 = [len(byte_array)] + byte_array

        byte_array = list(self.__appID.encode('utf-8'))
        encrypt_part10_11 = [len(byte_array)] + byte_array

        encrypt_part11_16 = [1, (random_num & 255) ^ 115, 249, 83, 103, 103, 201, 181, 131, 99, 94, 7, 68, 250, 132, 21]

        encrypt_124_old = encrypt_part1_4 + encrypt_part2_4 + encrypt_part3_8 + encrypt_part4_8 + encrypt_part5_4 + encrypt_part6_4 + encrypt_part7_4 + encrypt_part8_8 + encrypt_part9_53 + encrypt_part10_11 + encrypt_part11_16

        # 加密
        encrypt_124_new = [i^j for i, j in zip(encrypt_124_old, self.__xorkey)]
        encoded_str = "mns0101_" + self.__base58_encode(bytes(encrypt_124_new))
        return encoded_str


    def encrypt_headers_xs(self, cookie_a1: str, cookie_loadts: int, uri: str="", params: dict = None, data: dict = None) -> str:
        """
        Args:
            cookie_a1: Cookie中的a1值
            cookie_loadts: Cookie中的loadts(请求网页的时间戳)
            uri: 请求的url路径，例如 "/api/sns/web/v1/homefeed"
            params: get请求参数字典
            data: post请求数据字典
        Returns:
            str: 加密后的X-S字符串，格式为 "XYS_XXXXXXXXXXXXXXXXX"
        """
        
        p = {
            'x0' : self.__language_version,
            'x1' : self.__appID,
            'x2' : self.__os_system,
            'x3' : self.__encrypt_headers_x3(cookie_a1, cookie_loadts, uri, params, data),
            'x4' : "" if data is None else "object"
        }
        p_base64_encoded = b64_encode(
            encode_utf8(
                    urllib.parse.quote(
                        json.dumps(p, separators=(",", ":")), safe="-_.!~*'()")
                )
            , self.__base64_table)
        return "XYS_" + p_base64_encoded 

