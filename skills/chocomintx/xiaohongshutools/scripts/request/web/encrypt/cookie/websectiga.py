import base64
import json
import re

class XHS_Websectiga_Encrypt:
    """小红书 websectiga 解密实现类
    https://as.xiaohongshu.com/api/sec/v1/shield/webprofile -> data 加密
    """

    def __init__(self):
        # 预留配置加载入口（如有配置项可在此处加载并大写+双下划线隐藏）
        pass

    @staticmethod
    def __get_jsvmpdata(js_text: str) -> tuple[str, dict]:
        """提取 b 和 d 字段"""
        b = re.search(r'"b":"(.*?)",', js_text).group(1)
        d = re.search(r'"d":(.*?)\}\)', js_text).group(1)
        return b, json.loads(d)

    @staticmethod
    def __decode_jsvmp_to_logic_list(encoded_str: str) -> list[list[int]]:
        """Base64 解码并转为逻辑列表"""
        padding = len(encoded_str) % 4
        if padding:
            encoded_str += '=' * (4 - padding)
        decoded_str = base64.b64decode(encoded_str).decode('utf-8')
        result = []
        current_chunk = []
        for char in decoded_str:
            if len(current_chunk) == 5:
                result.append(current_chunk)
                current_chunk = []
            char_code = ord(char)
            current_chunk.append(char_code - 1)
        if current_chunk:
            result.append(current_chunk)
        return result

    def gen_websectiga(self, js_text: str) -> str:
        """
        Args:
            js_text (str): 请求 Post https://as.xiaohongshu.com/api/sec/v1/scripting -> json[data][data] 中提取

        Returns:
            str: 解密jsvmp后的websectiga

        """
        b, d = self.__get_jsvmpdata(js_text)
        decode_logic_list = self.__decode_jsvmp_to_logic_list(b)
        tatget_decode_list = decode_logic_list[d[92]:d[93]+1]
        key = [d[tatget_decode_list[675+i][2]] for i in range(0, 128, 2)]
        decode_key = [chr(key[i+j]) for i in range(56, -1, -8) for j in range(8)]
        return "".join(decode_key)