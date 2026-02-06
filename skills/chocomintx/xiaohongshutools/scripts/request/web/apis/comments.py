import asyncio
import aiohttp

from typing import Optional, TYPE_CHECKING
if TYPE_CHECKING:
    from request.web.xhs_session import XHS_Session  # 仅类型检查时导入



class Comments:
    """ 评论相关页面 """
    
    def __init__(self, session: "XHS_Session"):
        self.session = session

    # 获取笔记评论列表
    async def get_comments(self,  note_id: str, xsec_token: str, cursor: str = "", top_comment_id: str = "",  image_formats:str = "jpg,webp,avif") -> aiohttp.ClientResponse:
        """获取笔记评论列表

        Args:
            note_id: 笔记ID
            xsec_token: xsec_token
            cursor: 分页游标
            top_comment_id: ""
            image_formats: "jpg,webp,avif"

        Returns:
            评论列表数据
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v2/comment/page"
        params = {
            "note_id": note_id, 
            "cursor": cursor,         
            "top_comment_id": top_comment_id,
            "image_formats": image_formats,
            "xsec_token": xsec_token
            }
        
        return await self.session.request(method="get", url=url, params=params)

    # 获取子评论列表
    async def get_sub_comments(self, note_id: str, root_comment_id: str, num: int = 30, cursor: str = "") -> aiohttp.ClientResponse:
        """获取子评论列表

        Args:
            note_id: 笔记ID
            root_comment_id: 父评论ID
            num: 每页数量
            cursor: 分页游标

        Returns:
            子评论列表数据
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v2/comment/sub/page"
        params = {
            "note_id": note_id,
            "root_comment_id": root_comment_id,
            "num": num,
            "cursor": cursor
        }
        return await self.session.request("get", url, params)

    # 创建评论
    async def create_comment(self, note_id: str, content: str, at_users: Optional[list] = None) -> aiohttp.ClientResponse:
        """发表评论

        Args:
            note_id: 笔记ID
            content: 评论内容
            at_users: @用户列表

        Returns:
            评论创建结果
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v1/comment/post"
        data = {
            "note_id": note_id,
            "content": content,
            "at_users": at_users or []
        }
        return await self.session.request("post", url, data=data)

    # 回复评论
    async def reply_comment(self, note_id: str, comment_id: str, content: str, at_users: Optional[list] = None) -> aiohttp.ClientResponse:
        """回复评论

        Args:
            note_id: 笔记ID
            comment_id: 要回复的评论ID
            content: 回复内容
            at_users: @用户列表

        Returns:
            评论回复结果
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v1/comment/post"
        data = {
            "note_id": note_id,
            "content": content,
            "target_comment_id": comment_id,
            "at_users": at_users or []
        }
        return await self.session.request("post", url, data=data)

    # 删除评论
    async def delete_comment(self, note_id: str, comment_id: str) -> aiohttp.ClientResponse:
        """删除评论

        Args:
            note_id: 笔记ID
            comment_id: 要删除的评论ID

        Returns:
            删除结果
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v1/comment/delete"
        data = {
            "note_id": note_id,
            "comment_id": comment_id
        }
        return await self.session.request("post", url, data)

    # 点赞评论
    async def like_comment(self, note_id: str, comment_id: str) -> aiohttp.ClientResponse:
        """点赞评论 如果是二级评论，直接填写需要点赞的子评论ID即可

        Args:
            note_id: 笔记ID
            comment_id: 评论ID

        Returns:
            点赞结果
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v1/comment/like"
        data = {
            'note_id': note_id,
            'comment_id': comment_id
        }
        return await self.session.request(method="post", url=url, data=data)

    # 取消点赞评论
    async def cancel_like_comment(self, note_id: str, comment_id: str) -> aiohttp.ClientResponse:
        """取消点赞评论

        Args:
            note_id: 笔记ID
            comment_id: 评论ID

        Returns:
            取消点赞结果
        """
        url = "https://edith.xiaohongshu.com/api/sns/web/v1/comment/dislike"
        data = {
            "note_id": note_id,
            "comment_id": comment_id
        }
        return await self.session.request("post", url=url, data=data)

    # 获取笔记所有评论(包括子评论)
    async def get_all_comments(self, note_id: str, xsec_token: str, crawl_interval: int = 2, max_crawl_times: int = 3) -> str:
        """获取笔记所有评论(包括子评论)

        Args:
            note_id: 笔记ID
            xsec_token: xsec_token
            crawl_interval: 爬取间隔(秒)
            max_crawl_times: 最大爬取次数(防止死循环)

        Returns:
            所有评论列表
        """
        result = []
        comments_has_more = True
        comments_cursor = ""

        now_times = 0
        while comments_has_more and now_times < max_crawl_times:

            now_times += 1
            comments_res = await self.get_comments(note_id, xsec_token, comments_cursor)
            res_json = await comments_res.json()
            comments_json = res_json['data']
            comments_has_more = comments_json.get("has_more", False)
            comments_cursor = comments_json.get("cursor", "")
            comments = comments_json["comments"]

            print(f"获取到{len(comments)}条评论")

            for comment in comments:
                result.append(comment)
                # cur_sub_comment_count = int(comment["sub_comment_count"])
                # cur_sub_comments = comment["sub_comments"]
                # result.extend(cur_sub_comments)

                # sub_comments_has_more = comment["sub_comment_has_more"] and len(cur_sub_comments) < cur_sub_comment_count
                # sub_comment_cursor = comment["sub_comment_cursor"]

                # while sub_comments_has_more:
                #     page_num = 30
                #     sub_comments_res = await self.get_sub_comments(
                #         note_id,
                #         comment["id"],
                #         num=page_num,
                #         cursor=sub_comment_cursor
                #     )
                #     sub_comments = sub_comments_res["comments"]
                #     sub_comments_has_more = sub_comments_res["has_more"] and len(sub_comments) == page_num
                #     sub_comment_cursor = sub_comments_res["cursor"]
                #     result.extend(sub_comments)

                #     await asyncio.sleep(crawl_interval)

            await asyncio.sleep(crawl_interval)

        return f"笔记:{note_id}, 获取到{len(result)}"
    


