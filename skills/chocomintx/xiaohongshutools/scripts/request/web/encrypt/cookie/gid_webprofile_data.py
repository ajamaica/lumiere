import json
import base64
from Crypto.Cipher import DES
from request.web.encrypt.config import xhs_config

class XHS_Gid_Webprofile_Data_Encrypt:
    """小红书 获取gid所需要的data 加密实现类
    https://as.xiaohongshu.com/api/sec/v1/shield/webprofile -> data 加密
    """

    def __init__(self):
        # 加载加密相关配置
        self.__DES_KEY = xhs_config.get('GID_ENCRYPT', 'DES_KEY').encode()
        self.__URL = xhs_config.get('GID_ENCRYPT', 'URL')
        self.__PLATFORM = xhs_config.get('GID_ENCRYPT', 'DATA_PALTFORM')
        self.__SDK_VERSION = xhs_config.get('GID_ENCRYPT', 'DATA_SDK_VERSION')
        self.__SVN = xhs_config.get('GID_ENCRYPT', 'DATA_SVN')

    @staticmethod
    def zero_pad(data: bytes, block_size: int = 8) -> bytes:
        """使用零填充到块大小的倍数"""
        pad_len = block_size - len(data) % block_size
        return data + b'\x00' * pad_len

    def __encrypt_profileData(self, fp: dict) -> str:
        """加密 profileData 字段"""
        fp_jsonify = json.dumps(fp, separators=(',', ':'), ensure_ascii=False)
        fp_base64 = base64.b64encode(fp_jsonify.encode())
        cipher = DES.new(self.__DES_KEY, DES.MODE_ECB)
        ciphertext = cipher.encrypt(self.zero_pad(fp_base64))
        return ciphertext.hex()

    def gen_gid_webprofile_data(self, fp: dict) -> tuple[str, dict]:
        """生成获取gid所需要的data参数

        Args:
            fp (dict): 指纹数据

        Returns:
            tuple[str, dict]: (请求地址, 请求参数)
        """
        data = {
            "platform": self.__PLATFORM,
            "profileData": self.__encrypt_profileData(fp),
            "sdkVersion": self.__SDK_VERSION,
            "svn": self.__SVN
        }
        return self.__URL, data

