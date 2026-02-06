
"""
    自定义小红书 session类型 异常类，用于表示 小红书网络请求方面或返回信息的异常处理。
"""

# class RequestError(Exception): ...

# web相关
class RequestMaxRetryError(Exception): ...
class OtherRequestError(Exception): ...





# respones status code相关

# 461 访问频次异常，请勿频繁操作或重启试试
class FrequencyError(Exception): ...

# 461、471 - 124 需要扫码认证
class NeedScanLogin(Exception): 
    def __init__(self, details):
        self.details = details
        super().__init__(str(self.details))
        
    def __getitem__(self, key):
        return self.details[key]

# 需要滑块
class NeedSlideVerify(Exception):
    def __init__(self, details):
        self.details = details
        super().__init__(str(self.details))

    def __getitem__(self, key):
        return self.details[key]


# 461 网络连接异常，请检查网络设置或重启试试
class NetworkError(Exception): ...
# 其他异常
class OtherStatusError(Exception): ...






# msg相关

class LoginTimeOut(Exception): ...

class MutedError(Exception): ...

class PermissionError(Exception): ...

class BannedError(Exception): ...

class UserCloseCommentAtError(Exception): ...

class TaskDeleteError(Exception): ...

class OtherMessagesError(Exception): ...

class CantCommentError(Exception): ...