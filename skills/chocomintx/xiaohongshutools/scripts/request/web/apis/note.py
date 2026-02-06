import asyncio
import aiohttp
import time
import random
import uuid
from enum import Enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from request.web.xhs_session import XHS_Session  # 仅类型检查时导入

def base36encode(number, alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'):
    if not isinstance(number, int):
        raise TypeError('number must be an integer')

    base36 = ''
    sign = ''

    if number < 0:
        sign = '-'
        number = -number

    if 0 <= number < len(alphabet):
        return sign + alphabet[number]

    while number != 0:
        number, i = divmod(number, len(alphabet))
        base36 = alphabet[i] + base36

    return sign + base36

def get_search_id():
    e = int(time.time() * 1000) << 64
    t = int(random.uniform(0, 2147483646))
    return base36encode((e + t))

class HomeFeedCategory(Enum):
    """主页信息流分类的枚举"""
    # 推荐
    RECOMMEND = "homefeed_recommend"
    # 穿搭
    FASHION = "homefeed.fashion_v3"
    # 美食
    FOOD = "homefeed.food_v3"
    # 彩妆
    COSMETICS = "homefeed.cosmetics_v3"
    # 影视
    MOVIE_TV = "homefeed.movie_and_tv_v3"
    # 职场
    CAREER = "homefeed.career_v3"
    # 情感
    LOVE = "homefeed.love_v3"
    # 家居
    HOUSEHOLD = "homefeed.household_product_v3"
    # 游戏
    GAMING = "homefeed.gaming_v3"
    # 旅行
    TRAVEL = "homefeed.travel_v3"
    # 健身
    FITNESS = "homefeed.fitness_v3"


class Note:

    def __init__(self, session: "XHS_Session"):
        self.session = session  # 保存会话引用
        self.homefeed_category_enum = HomeFeedCategory # 给到外部使用


        # 点赞笔记
    async def like_note(self, note_id: str) -> aiohttp.ClientResponse:
        """点赞笔记

        Args:
            note_id: 笔记ID

        Returns:
            点赞结果
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v1/note/like"
        data = {
            "note_oid": note_id
        }
        return await self.session.request(method="post", url=url, data=data)

    # 获取笔记详情
    async def note_detail(self, note_id: str, xsec_token: str) -> aiohttp.ClientResponse:
        """获取笔记详情

        Args:
            note_id: 笔记ID
            xsec_token: xsec_token

        Returns:
            笔记详情结果
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v1/feed"
        data = {
            'source_note_id': note_id,
            'image_formats': ["jpg","webp","avif"],
            'extra':{"need_body_topic":"1"},
            'xsec_source':'pc_feed',
            'xsec_token':xsec_token
        }

        return await self.session.request(method="post", url=url, data=data)

    # 搜索笔记
    async def search_notes(self,keyword: str, page: int = 2, page_size: int = 20, sort: str = "general", note_type: int = 0) -> aiohttp.ClientResponse:
        """搜索笔记

        Args:
            keyword: 搜索关键词
            page: 页码  默认 1
            page_size: 每页大小 默认 20
            sort: 排序方式  默认 "general"
            note_type: 笔记类型 默认 0
        """
        uri = "https://edith.xiaohongshu.com/api/sns/web/v1/search/notes"
        data = {
            "keyword": keyword,
            "page": page,
            "page_size": page_size,
            "search_id": get_search_id(),
            "sort": sort,
            "note_type": note_type,
            "ext_flags": [],
            "geo": "",
            "image_formats": [
                "jpg",
                "webp",
                "avif"
            ]
        }
        return await self.session.request("post", url=uri, json=data)

    # 搜索用户笔记
    async def search_user_notes(self, user_id: str, num: int = 30, cursor: str = "") -> aiohttp.ClientResponse:
        """搜索用户笔记

        Args:
            user_id: 用户ID
            num: 数量  默认 30
            cursor: 游标 默认空
            sort: 排序方式  默认 "new"
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v1/user_posted"
        params = {
            "num": num,
            "cursor": cursor,
            "user_id": user_id,
            "image_formats": "jpg,webp,avif",
            # "xsec_token": "ABYdlTOd3-PPBne2xHkKi1fRfNr-8noY9mu5DEZ3X0rZs=",
            "xsec_source": "pc_feed"
        }
        return await self.session.request("get", url=url, params=params)

    # 进入笔记 - 上报系统
    async def enter_metrics_report(self, note_id: str, note_type: int, request_id : str, viewer_id: str, author_id: str) -> aiohttp.ClientResponse:
        """进入笔记

        Args:
            note_id: 笔记ID
            note_type: 笔记类型 1 普通笔记 2 视频笔记
            request_id: 请求ID (UUID4)
            viewer_id: 观看者ID
            author_id: 作者ID

        Returns:
            进入笔记结果
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v1/note/metrics_report"
        data = {
            "note_id": note_id,
            "note_type": note_type,
            "report_type": 3,
            "stress_test": False,
            "trace": {
                "request_id": request_id
            },
            "viewer": {
                "user_id": viewer_id,
                "followed_author": 0
            },
            "author": {
                "user_id": author_id
            },
            "interaction": {
                "like": 0,
                "collect": 0,
                "comment": 0,
                "comment_read": 0
            },
            "note": {
                "stay_seconds": 0
            },
            "other": {
                "platform": "web"
            }
        }
        return await self.session.request("post", url=url, data=data)

    # 退出笔记 - 上报系统
    async def exit_metrics_report(self, note_id: str, note_type: int, request_id : str, viewer_id: str, author_id: str, stay_seconds: int) -> aiohttp.ClientResponse:
        """退出笔记

        Args:
            note_id: 笔记ID
            note_type: 笔记类型 1 普通笔记 2 视频笔记
            request_id: 请求ID (UUID4)
            viewer_id: 观看者ID
            author_id: 作者ID
            stay_seconds: 停留时间 秒

        Returns:
            退出笔记结果
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v1/note/metrics_report"
        data = {
            "note_id": note_id,
            "note_type": note_type,
            "report_type": 2,
            "stress_test": False,
            "trace": {
                "request_id": request_id
            },
            "viewer": {
                "user_id": viewer_id,
                "followed_author": 0
            },
            "author": {
                "user_id": author_id
            },
            "interaction": {
                "like": 0,
                "collect": 0,
                "comment": 0,
                "comment_read": 1
            },
            "note": {
                "stay_seconds": stay_seconds
            },
            "other": {
                "platform": "web"
            }
        }
        return await self.session.request("post", url=url, data=data)

    # 增加笔记阅读数
    async def add_note_readnum(self, note_id: str, xsec_token: str) -> aiohttp.ClientResponse:
        """增加笔记阅读数

        Args:
            note_id: 笔记ID
            xsec_token: xsec_token

        Returns:
            增加阅读数结果
        """

        user_info_res = await self.session.apis.auth.get_self_simple_info()
        viewer_id = user_info_res.json()["data"]["user_id"]

        note_detail_res = await self.note_detail(note_id, xsec_token)
        note_card = note_detail_res.json()["data"]["items"][0]["note_card"]
        author_id = note_card['user']['user_id']
        note_type = 1 if note_card['type'] == "normal" else 2

        request_id = str(uuid.uuid4())

        enter_note_res = await self.enter_metrics_report(note_id=note_id, note_type=note_type, request_id=request_id, viewer_id=viewer_id, author_id=author_id)

        if random.choice([True, False]):
            return enter_note_res

        stay_seconds = random.randint(3, 15)
        await asyncio.sleep(stay_seconds)

        exit_note_res = await self.exit_metrics_report(note_id=note_id, note_type=note_type, request_id=request_id, viewer_id=viewer_id, author_id=author_id, stay_seconds=stay_seconds)
        return exit_note_res

    # 推荐页
    async def get_homefeed(self, category: HomeFeedCategory, cursor_score: str = "", note_index: int = 0) -> aiohttp.ClientResponse:
        """刷推荐页

        Args:
            category(HomeFeedCategory): 分类
            cursor_score(str): 类似游标， 在上一页返回结果中
            note_index(int): 笔记索引， 不知道怎么算的 一直往上加就好
        """

        url = "https://edith.xiaohongshu.com/api/sns/web/v1/homefeed"
        data = {
            "cursor_score": cursor_score,
            "num": 25,
            "refresh_type": 1,
            "note_index": note_index,
            "unread_begin_note_id": "",
            "unread_end_note_id": "",
            "unread_note_count": 0,
            "category": category.value,
            "search_key": "",
            "need_num": 10,
            "image_formats": [
                "jpg",
                "webp",
                "avif"
            ],
            "need_filter_image": False
        }
        return await self.session.request("post", url=url, data=data)

