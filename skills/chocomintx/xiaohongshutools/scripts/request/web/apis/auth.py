import asyncio
import random
import uuid

import aiohttp

from typing import Dict, TYPE_CHECKING
if TYPE_CHECKING:
    from request.web.xhs_session import XHS_Session

from loguru import logger

# from request.app.apis.app_scan_login import async_scan_login
#  request.app.apis.app_scan_pass_124 import async_scan_pass_124

class Authentication:
    def __init__(self, session: "XHS_Session"):
        self.session = session  # 保存会话引用

    async def scan_login(self, sid, did :str = None) -> bool:
        """扫码登录
        Args:
            did: 设备ID
            sid: 会话ID
        Returns:
            Dict: 登录结果
        """

        # 为session设置did和sid
        self.session._did = did if did else str(uuid.uuid4())
        self.session._sid = sid

        url = "https://edith.xiaohongshu.com/api/sns/web/v1/login/qrcode/create"
        data = {
            "qr_type": 1
        }
        response = await self.session.request(method="post", url=url, data=data)

        res_json = await response.json()
        qr_id = res_json["data"]["qr_id"]
        code = res_json["data"]["code"]

        
        post_api_at_times = random.randint(2, 5)

        for i in range(30):
            if i == post_api_at_times:
                raise ValueError("需自行接入APP扫码功能")
                # try:
                #     await async_scan_login(self.session._did, self.session._sid, qr_id, code, proxy=self.session._proxy_url)
                # except Exception as e:
                #     logger.error(f"扫码登录失败: {e}")
                #     raise Exception(f"扫码登录失败: {e}")


            url = "https://edith.xiaohongshu.com/api/sns/web/v1/login/qrcode/status"
            params = {
                "qr_id": qr_id,
                "code": code
            }
            response = await self.session.request(method="get", url=url, params=params)
            res_json = await response.json()
            if str(res_json["data"]["code_status"]) == "2":
                logger.success(f"扫码登录成功")
                return True
            else:
                await asyncio.sleep(1)
        raise ValueError("扫码登录失败")

    async def pass_scan_124(self, verifyType, verifyBiz, verifyUuid, sourceSite, did, sid) -> bool:
        """扫码登录
        Args:
            did: 设备ID 如果不填将自动使用扫码登录的did
            sid: 会话ID 如果不填将自动使用扫码登录的sid
            verifyType: 验证类型
            verifyBiz: 验证业务
            verifyUuid: 验证UUID
            sourceSite: 来源站点
        Returns:
            Dict: 登录结果
        """




        url = "https://edith.xiaohongshu.com/api/redcaptcha/v2/qr/init"
        data = {
            "verifyType": str(verifyType),
            "verifyUuid": str(verifyUuid),
            "verifyBiz": str(verifyBiz),
            "sourceSite": str(sourceSite)
        }
        response =  await self.session.request("post", url, data=data)
        res_json = await response.json()
        rid = res_json["data"]["rid"]
        
        post_api_at_times = random.randint(2, 5)
        for i in range(10):

            if i == post_api_at_times:
                raise ValueError("需自行接入APP扫码通过二维码功能")
                # try:
                #     await async_scan_pass_124(did, sid, verifyType, verifyBiz, verifyUuid, rid, proxy=self.session._proxy_url)
                # except Exception as e:
                #     # logger.error(f"通过安全二维码失败: {e}")
                #     raise Exception(f"通过安全二维码失败: {e}")


            url = "https://edith.xiaohongshu.com/api/redcaptcha/v2/qr/status/query"

            data = {
                "verifyType": verifyType,
                "verifyUuid": verifyUuid,
                "verifyBiz": verifyBiz,
                "sourceSite": sourceSite,
                "rid": rid
            }

            response =  await self.session.request("post", url, data=data)
            res_json = await response.json()
            if str(res_json["data"]["status"]) == "4": # 4: 已确认
                return True
            else:
                await asyncio.sleep(1)

    async def send_code(self, phone: str, zone: str = "86") -> aiohttp.ClientResponse:
        """发送验证码
        Args:
            phone: 手机号
            zone: 区号 目前不支持修改其他国家
        Returns:
            Dict: 发送结果
        """

        url = "https://edith.xiaohongshu.com/api/sns/web/v2/login/send_code"
        params = {
            "phone": phone,
            "zone": zone,
            "type": "login"
        }

        return await self.session.request(method="get", url=url, params=params)


    async def get_self_simple_info(self) -> aiohttp.ClientResponse:
        """获取当前登录用户简要信息
        Returns:
            Dict: 用户信息
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v2/user/me"
        return await self.session.request(method="get", url=url)