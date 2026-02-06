import random
import math
import time

class XHS_Xray_Encrypt:
    """小红书 x-xray 加密实现类
    
    时间戳+随机数 乱七八糟一顿算出的32位的16进制字符串
    需要注意的是，每次调用 get_seq 方法，加密中有一个数值会加1。怀疑跟X-S-Common中的X10类似。
    """
    
    def __init__(self):
        self.__seq = self.__xb3_random(23)

    @staticmethod
    def __xb3_random(e: int) -> int:
        """生成随机数 e为指数"""
        return math.floor(random.random() * math.pow(2, e))

    def __get_seq(self) -> int:
        """获取 seq"""
        self.__seq = self.__seq + 1
        return self.__seq
    
    def encrypt_headers_xray(self) -> str:
        """生成x-xray加密字符串
        注意这个方法要在x-t之前调用
        整个加密过程包括以下步骤：
        1. 时间戳左移23位
        2. 与一个随机数异或，这个随机数第一次调用即确定，每次调用get_seq()会加1
        3. 将结果转换为16进制字符串并填充到16位长度
        4. 用随机数生成16进制字符串并填充到16位长度
        5. 将两个16进制字符串拼接
        Returns:
            str: 加密后的 x-xray-traceid 字符串
        """
        
        seq = self.__get_seq()
        part1 = hex(int(time.time() * 1000) << 23 | seq)[2:].zfill(16)

        high32 = math.floor(random.random() * math.pow(2, 32))
        low32 = math.floor(random.random() * math.pow(2, 32)) 
        long_value = (high32 << 32) | low32 
        part2 = hex(long_value)[2:].zfill(16)

        return part1 + part2
        