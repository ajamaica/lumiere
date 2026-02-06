#!/usr/bin/env python3
"""
微信本地数据读取工具
支持：读取聊天记录、联系人、会话列表
⚠️ 只读操作，不会修改任何数据
"""

import sqlite3
import json
import os
import sys
import argparse
from datetime import datetime
from typing import List, Dict, Optional

# 微信数据默认路径 (macOS)
DEFAULT_WECHAT_PATH = os.path.expanduser(
    "~/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/"
)

def find_wechat_databases(base_path: str = None) -> Dict[str, str]:
    """查找微信数据库文件"""
    if base_path is None:
        base_path = DEFAULT_WECHAT_PATH
    
    databases = {}
    
    # 常见的数据库文件
    db_files = {
        'chat': 'Chat.sqlite',
        'contact': 'Contact.sqlite', 
        'session': 'Session.sqlite',
        'favorite': 'Favorite.sqlite',
        'brand': 'Brand.sqlite'
    }
    
    # 在目录中搜索
    for root, dirs, files in os.walk(base_path):
        for db_type, db_name in db_files.items():
            if db_name in files:
                db_path = os.path.join(root, db_name)
                if db_type not in databases:  # 只保留第一个找到的
                    databases[db_type] = db_path
    
    return databases

def read_sqlite_db(db_path: str, query: str, params: tuple = ()) -> List[Dict]:
    """安全读取 SQLite 数据库（只读模式）"""
    if not os.path.exists(db_path):
        return []
    
    try:
        # 使用只读模式打开
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"⚠️  读取数据库失败: {e}")
        return []

def format_wechat_time(timestamp: int) -> str:
    """格式化微信时间戳（毫秒级 Unix 时间戳）"""
    try:
        dt = datetime.fromtimestamp(timestamp / 1000)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        return str(timestamp)

def get_recent_chats(db_path: str, limit: int = 20) -> List[Dict]:
    """获取最近聊天记录"""
    # 注意：实际表结构可能因微信版本而异
    # 这里使用常见的表名
    query = """
        SELECT 
            c.UsrName as contact_id,
            c.NickName as nickname,
            m.localType as type,
            m.msgContent as content,
            m.msgCreateTime as time
        FROM Chat_crContact c
        LEFT JOIN (
            SELECT * FROM Chat_ftsMessage
            ORDER BY msgCreateTime DESC
            LIMIT ?
        ) m ON c.UsrName = m.des
        ORDER BY m.msgCreateTime DESC
        LIMIT ?
    """
    
    return read_sqlite_db(db_path, query, (limit, limit))

def get_contacts(db_path: str, limit: int = 50) -> List[Dict]:
    """获取联系人列表"""
    query = """
        SELECT 
            UsrName as username,
            NickName as nickname,
            Remark as remark,
            IFNULL(Remark, NickName) as display_name,
            ConStrRes2 as avatar,
            type as contact_type
        FROM WCContact
        WHERE type & 1 = 0  -- 排除公众号等
        ORDER BY 
            CASE 
                WHEN Remark IS NOT NULL THEN Remark
                ELSE NickName
            END
        LIMIT ?
    """
    
    return read_sqlite_db(db_path, query, (limit,))

def get_chat_sessions(db_path: str, limit: int = 30) -> List[Dict]:
    """获取会话列表"""
    query = """
        SELECT 
            s.UsrName as username,
            s.UnreadCount as unread_count,
            s.lastTime as last_time,
            s.digest as last_message,
            CASE 
                WHEN s.flag & 2 = 2 THEN '置顶'
                ELSE ''
            END as is_pinned
        FROM Session s
        ORDER BY s.lastTime DESC
        LIMIT ?
    """
    
    results = read_sqlite_db(db_path, query, (limit,))
    
    # 格式化时间
    for item in results:
        if 'last_time' in item:
            item['last_time_formatted'] = format_wechat_time(item.get('last_time', 0))
    
    return results

def search_messages(db_path: str, keyword: str, limit: int = 50) -> List[Dict]:
    """搜索消息内容"""
    query = """
        SELECT 
            m.msgId as id,
            m.des as contact_id,
            c.NickName as nickname,
            m.msgContent as content,
            m.msgCreateTime as time
        FROM Chat_ftsMessage m
        JOIN Chat_crContact c ON m.des = c.UsrName
        WHERE m.msgContent LIKE ?
        ORDER BY m.msgCreateTime DESC
        LIMIT ?
    """
    
    results = read_sqlite_db(db_path, query, (f'%{keyword}%', limit))
    
    for item in results:
        if 'time' in item:
            item['time_formatted'] = format_wechat_time(item.get('time', 0))
    
    return results

def get_favorites(db_path: str, limit: int = 20) -> List[Dict]:
    """获取收藏内容"""
    query = """
        SELECT 
            f.localId as id,
            f.favType as type,
            f.sourceId as source,
            f.updateTime as time,
            f.xml as content
        FROM FavItem f
        ORDER BY f.updateTime DESC
        LIMIT ?
    """
    
    results = read_sqlite_db(db_path, query, (limit,))
    
    for item in results:
        if 'time' in item:
            item['time_formatted'] = format_wechat_time(item.get('time', 0))
    
    return results

def get_statistics(db_path: str) -> Dict:
    """获取统计信息"""
    stats = {
        'contacts': 0,
        'messages': 0,
        'sessions': 0,
        'favorites': 0
    }
    
    # 联系人数量
    result = read_sqlite_db(db_path, "SELECT COUNT(*) as count FROM WCContact")
    if result:
        stats['contacts'] = result[0].get('count', 0)
    
    # 消息数量（估算）
    result = read_sqlite_db(db_path, "SELECT COUNT(*) as count FROM Chat_ftsMessage")
    if result:
        stats['messages'] = result[0].get('count', 0)
    
    # 会话数量
    result = read_sqlite_db(db_path, "SELECT COUNT(*) as count FROM Session")
    if result:
        stats['sessions'] = result[0].get('count', 0)
    
    # 收藏数量
    result = read_sqlite_db(db_path, "SELECT COUNT(*) as count FROM FavItem")
    if result:
        stats['favorites'] = result[0].get('count', 0)
    
    return stats

def print_contacts(contacts: List[Dict]):
    """打印联系人列表"""
    if not contacts:
        print("📭 没有找到联系人")
        return
    
    print(f"\n👥 联系人列表 ({len(contacts)} 个):\n")
    print(f"{'序号':<6} {'昵称/备注':<20} {'微信号':<20}")
    print("-" * 50)
    
    for i, contact in enumerate(contacts, 1):
        display = contact.get('display_name', 'Unknown')[:18]
        username = contact.get('username', 'Unknown')[:18]
        print(f"{i:<6} {display:<20} {username:<20}")

def print_sessions(sessions: List[Dict]):
    """打印会话列表"""
    if not sessions:
        print("📭 没有找到会话")
        return
    
    print(f"\n💬 最近会话 ({len(sessions)} 个):\n")
    
    for session in sessions:
        username = session.get('username', 'Unknown')
        unread = session.get('unread_count', 0)
        time_str = session.get('last_time_formatted', 'Unknown')
        message = session.get('last_message', '无消息')[:30]
        pinned = session.get('is_pinned', '')
        
        unread_mark = f"🔴 {unread}" if unread > 0 else "  "
        pin_mark = "📌" if pinned else "  "
        
        print(f"{pin_mark} {unread_mark} {username:<20} {time_str}")
        print(f"      💬 {message}")
        print()

def print_messages(messages: List[Dict]):
    """打印消息列表"""
    if not messages:
        print("📭 没有找到消息")
        return
    
    print(f"\n📨 搜索结果 ({len(messages)} 条):\n")
    
    for msg in messages:
        nickname = msg.get('nickname', 'Unknown')
        content = msg.get('content', '')[:100]
        time_str = msg.get('time_formatted', 'Unknown')
        
        print(f"👤 {nickname} • {time_str}")
        print(f"   {content}")
        print()

def main():
    parser = argparse.ArgumentParser(
        description='微信本地数据读取工具（只读）',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s --path ~/Library/Containers/com.tencent.xinWeChat/... list
  %(prog)s contacts
  %(prog)s sessions --limit 10
  %(prog)s search "关键词"
  %(prog)s stats
        """
    )
    
    parser.add_argument('--path', '-p', help='微信数据目录路径')
    parser.add_argument('--limit', '-l', type=int, default=20, help='显示数量限制')
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # list 命令 - 列出所有数据库
    subparsers.add_parser('list', help='列出找到的数据库文件')
    
    # contacts 命令
    subparsers.add_parser('contacts', help='列出联系人')
    
    # sessions 命令
    subparsers.add_parser('sessions', help='列出最近会话')
    
    # search 命令
    search_parser = subparsers.add_parser('search', help='搜索消息内容')
    search_parser.add_argument('keyword', help='搜索关键词')
    
    # favorites 命令
    subparsers.add_parser('favorites', help='列出收藏内容')
    
    # stats 命令
    subparsers.add_parser('stats', help='显示统计数据')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # 查找数据库
    wechat_path = args.path
    databases = find_wechat_databases(wechat_path)
    
    if not databases:
        print("❌ 未找到微信数据库文件")
        print(f"\n请确认微信数据路径:")
        print(f"默认路径: {DEFAULT_WECHAT_PATH}")
        print(f"\n或使用 --path 指定自定义路径")
        return
    
    if args.command == 'list':
        print("📁 找到的数据库文件:\n")
        for db_type, db_path in databases.items():
            print(f"  {db_type:<12} {db_path}")
    
    elif args.command == 'contacts':
        if 'contact' not in databases:
            print("❌ 未找到联系人数据库")
            return
        
        contacts = get_contacts(databases['contact'], args.limit)
        print_contacts(contacts)
    
    elif args.command == 'sessions':
        if 'session' not in databases:
            print("❌ 未找到会话数据库")
            return
        
        sessions = get_chat_sessions(databases['session'], args.limit)
        print_sessions(sessions)
    
    elif args.command == 'search':
        if 'chat' not in databases:
            print("❌ 未找到聊天记录数据库")
            return
        
        messages = search_messages(databases['chat'], args.keyword, args.limit)
        print_messages(messages)
    
    elif args.command == 'favorites':
        if 'favorite' not in databases:
            print("❌ 未找到收藏数据库")
            return
        
        favorites = get_favorites(databases['favorite'], args.limit)
        print(f"\n⭐ 收藏列表 ({len(favorites)} 项):\n")
        for item in favorites:
            print(f"  [{item.get('type', 'Unknown')}] {item.get('time_formatted', 'Unknown')}")
    
    elif args.command == 'stats':
        print("\n📊 微信数据统计:\n")
        for db_type, db_path in databases.items():
            print(f"📁 {db_type}: {db_path}")
        
        print("\n" + "-" * 40)
        
        if 'contact' in databases:
            stats = get_statistics(databases['contact'])
            print(f"👥 联系人数量: {stats.get('contacts', 0)}")
            print(f"💬 会话数量: {stats.get('sessions', 0)}")
            print(f"📨 消息数量: {stats.get('messages', 0)}")
            print(f"⭐ 收藏数量: {stats.get('favorites', 0)}")

if __name__ == '__main__':
    main()
