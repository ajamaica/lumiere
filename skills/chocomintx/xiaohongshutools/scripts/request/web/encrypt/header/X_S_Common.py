import json
import urllib.parse

from Crypto.Cipher import ARC4

from request.web.encrypt.config import xhs_config
from units.fuck_reverse_crypto.bitwise_operations import unsigned_right_shift
from request.web.encrypt.xhs_diy_encode import encode_utf8, b64_encode

class XHS_XSC_Encrypt:
    """小红书 x-s-common 加密实现类
    
    一个大字典拼来拼去 最后+魔改base64编码
    """
    def __init__(self):
        self.__plat_from_code = xhs_config.get('XHS_VERSION', 'GET_PLAT_FROM_CODE')
        self.__language_version = xhs_config.get('XHS_VERSION', 'LANGUAGE_VERSION')
        self.__os_system = xhs_config.get('XHS_VERSION', 'OS_SYSTEM')
        self.__app_id = xhs_config.get('XHS_VERSION', 'APP_ID')
        self.__artifact_version = xhs_config.get('XHS_VERSION', 'ARTIFACT_VERSION')
        self.__base64_table = xhs_config.get('XHS_VERSION', 'BASE64_TABLE')
        # b1相关
        self.__b1_key = xhs_config.get('XSC_ENCRYPT', 'B1_RC4_KEY').encode()

    @staticmethod
    def __diy_mrc(e):
        """私有方法：计算自定义 mrc"""
        
        def jsint(num):
            """js int 转换 不转换的话 异或结果会不正确"""
            return num % (2**32) if num >= 2**31 else num - 2**32
            
            
        """生成mrc表"""
        mrc_list = []
        for i in range(255, -1, -1):
            j = i
            for _ in range(8, 0, -1):
                j = unsigned_right_shift(j, 1) ^ 0xedb88320 if j & 1 else unsigned_right_shift(j, 1)
            mrc_list.insert(0, unsigned_right_shift(j, 0))
        
        """计算最终结果"""
        i = -1
        for r in e:
            i = mrc_list[255 & i ^ ord(r)] ^ unsigned_right_shift(i, 8)
        return -1 ^ jsint(i) ^ 0xedb88320

    def __encrypt_b1(self, fp):
        """私有方法：加密b1
            args:
                fp: fp字典
            returns:
                str: 生成的b1
        """

        b1_fp = {
            "x33": fp['x33'],
            "x34": fp['x34'],
            "x35": fp['x35'],
            "x36": fp['x36'],
            "x37": fp['x37'],
            "x38": fp['x38'],
            "x39": fp['x39'],
            "x42": fp['x42'],
            "x43": fp['x43'],
            "x44": fp['x44'],
            "x45": fp['x45'],
            "x46": fp['x46'],
            "x48": fp['x48'],
            "x49": fp['x49'],
            "x50": fp['x50'],
            "x51": fp['x51'],
            "x52": fp['x52'],
            "x82": fp['x82'],
        }

        b1_fp_jsonify = json.dumps(b1_fp, separators=(',', ':'), ensure_ascii=False)
        cipher = ARC4.new(self.__b1_key)
        ciphertext = cipher.encrypt(b1_fp_jsonify.encode('utf-8')).decode('latin1')
        encoded_url = urllib.parse.quote(ciphertext,safe="!*'()~_-")
        b = []
        for c in encoded_url.split('%')[1:]:
            chars = list(c)
            b.append(int(''.join(chars[:2]), 16))
            [b.append(ord(j)) for j in chars[2:]]
        b1 = b64_encode(bytearray(b), "ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5")
        return b1 

    def encrypt_headers_xsc(self, cookie_a1: str, fp: dict) -> str:
        """生成x-s-common加密字符串
        
        整个加密过程包括以下步骤：
        1. 组合字典
        2. 将字典转换为json字符串
        3. 将json字符串进行魔改base64编码

        Args:
            cookie_a1: 用户cookie中的a1值
            fp: fp字典

        Returns:
            str: 加密后的 x-s-common 字符串
        """
        localStorage_b1 = self.__encrypt_b1(fp)

        source_text = {
            's0' : self.__plat_from_code,
            's1' : "", # JS写死的空值
            'x0' : "1", # localStorage.getItem("b1b1")
            'x1' : self.__language_version,
            'x2' : self.__os_system,
            'x3' : self.__app_id,
            'x4' : self.__artifact_version,
            'x5' : cookie_a1,
            'x6' : "", # JS写死的空值 之前版本是XS
            'x7' : "", # JS写死的空值 之前版本是XT
            'x8' : localStorage_b1, # localStorage.getItem("b1")
            'x9' : int(self.__diy_mrc("" + "" + localStorage_b1)),
            'x10': fp["x39"], # 计次 调用一次api 就加1。                            (经过测试可以写死)
            'x11': "normal" # JS写死的空值
        }
        
        p_base64_encoded = b64_encode(
            encode_utf8(
                urllib.parse.quote(
                        json.dumps(source_text, separators=(",", ":"), ensure_ascii=False), safe="-_.!~*'()"
                    )
                )
            , self.__base64_table)
        return p_base64_encoded

   


