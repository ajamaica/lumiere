import random
from request.web.encrypt.config import xhs_config


class XHS_XB3_Encrypt:
    """小红书 x-b3-traceid 加密实现类
    
    用于生成小红书API请求所需的 x-b3-traceid 加密头。
    生成规则: 从 abcdef0123456789 中随机选择16个字符组成字符串。
    """

    def __init__(self):
        """初始化加密器，从配置文件读取必要的加密参数"""
        self.__VALID_CHARS = xhs_config.get("XB1_ENCRYPT", "VALID_CHARS")
        self.__TRACE_ID_LENGTH = xhs_config.get("XB1_ENCRYPT", "TRACE_ID_LENGTH")


    def encrypt_header_xb3(self) -> str:
        """生成 x-b3-traceid 加密字符串"""
        return ''.join(random.choices(self.__VALID_CHARS,  k=self.__TRACE_ID_LENGTH))
    