import configparser
import os

class Config:
    def __init__(self):
        self.config = configparser.ConfigParser()
        # 获取当前文件的目录
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, 'web_encrypt_config.ini')
        self.config.read(config_path, encoding='utf-8')

    def get(self, section: str, key: str, fallback=None):
        """
        获取配置项的通用方法
        """
        return eval(self.config.get(section, key, fallback=fallback))

# 单例模式
xhs_config = Config()
