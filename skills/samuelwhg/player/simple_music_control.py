#!/usr/bin/env python3
"""
简化版音乐播放控制模块
用于OpenClaw系统的音乐播放功能（不依赖psutil）
"""

import os
import subprocess
import sys
import random
import json
import time
from pathlib import Path
from typing import List, Optional


class SimpleMusicController:
    def __init__(self):
        self.mpv_path = r"E:\software\mpv-x86_64\mpv.exe"
        self.music_dir = Path(r"F:\Music")
        self.current_process = None
        self.pid_file = Path(r"E:\Workspace\AI\openclaw\skills\music-player\current_pid.json")
        
        # 验证路径
        if not os.path.exists(self.mpv_path):
            raise FileNotFoundError(f"MPV播放器未找到: {self.mpv_path}")
        if not self.music_dir.exists():
            raise FileNotFoundError(f"音乐目录未找到: {self.music_dir}")
        
        # 检查是否有之前的播放进程记录
        self._check_existing_process()
    
    def _check_existing_process(self):
        """检查是否有现有的播放进程记录"""
        try:
            if self.pid_file.exists():
                with open(self.pid_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    pid = data.get('pid')
                    filepath = data.get('filepath')
                    
                    # 这里我们简单地记录进程信息，但不实际检查进程是否还在运行
                    # 因为我们无法使用psutil
                    if pid and filepath:
                        print(f"上次播放记录: {Path(filepath).name} (PID: {pid}, 注意: 无法验证进程是否仍在运行)")
        except Exception as e:
            print(f"读取播放记录时出错: {e}")
    
    def _save_pid(self, proc, filepath):
        """保存进程ID和文件路径到文件"""
        try:
            data = {
                'pid': proc.pid,
                'filepath': str(filepath),
                'timestamp': time.time()
            }
            with open(self.pid_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存播放记录时出错: {e}")
    
    def _clear_pid(self):
        """清除PID文件"""
        try:
            if self.pid_file.exists():
                self.pid_file.unlink()
        except Exception as e:
            print(f"清除播放记录时出错: {e}")
    
    def get_supported_formats(self) -> tuple:
        """返回支持的音频格式"""
        return ('.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.wma', '.ape')
    
    def scan_music(self) -> List[Path]:
        """扫描音乐文件"""
        music_files = []
        formats = self.get_supported_formats()
        
        for root, dirs, files in os.walk(self.music_dir):
            for file in files:
                if file.lower().endswith(formats):
                    music_files.append(Path(root) / file)
        
        return sorted(music_files)
    
    def search_tracks(self, query: str) -> List[Path]:
        """搜索音乐"""
        all_tracks = self.scan_music()
        query_lower = query.lower()
        
        results = []
        for track in all_tracks:
            if query_lower in str(track).lower():
                results.append(track)
        
        return results
    
    def play_track(self, track_path: Path) -> bool:
        """播放单个曲目"""
        try:
            # 确保先停止任何正在播放的音乐
            self.stop_if_playing()
            time.sleep(0.2)  # 等待停止完成
            
            cmd = [str(self.mpv_path), "--", str(track_path)]
            self.current_process = subprocess.Popen(cmd)
            print(f"开始播放: {track_path.name}")
            # 保存播放记录
            self._save_pid(self.current_process, track_path)
            return True
        except Exception as e:
            print(f"播放失败: {e}")
            return False
    
    def play_random(self) -> bool:
        """随机播放一首"""
        tracks = self.scan_music()
        if not tracks:
            print("未找到任何音乐文件")
            return False
        
        track = random.choice(tracks)
        print(f"随机播放: {track.name}")
        return self.play_track(track)
    
    def play_directory(self, dir_name: str) -> bool:
        """播放指定目录"""
        target_dir = self.music_dir / dir_name
        
        if not target_dir.exists():
            # 尝试模糊匹配
            dirs = [d for d in self.music_dir.iterdir() if d.is_dir()]
            matched_dirs = [d for d in dirs if dir_name.lower() in d.name.lower()]
            
            if not matched_dirs:
                print(f"未找到目录: {dir_name}")
                available = [d.name for d in dirs[:10]]  # 只显示前10个
                if available:
                    print(f"可用目录: {', '.join(available)}")
                return False
            
            target_dir = matched_dirs[0]
            print(f"匹配到目录: {target_dir.name}")
        
        # 获取该目录下的所有音乐文件
        tracks = []
        formats = self.get_supported_formats()
        
        for file in target_dir.iterdir():
            if file.is_file() and file.suffix.lower() in formats:
                tracks.append(file)
        
        if not tracks:
            print(f"目录中没有找到音乐文件: {target_dir.name}")
            return False
        
        # 随机播放一首或者播放全部？
        # 这里我们播放第一首，用户可以要求播放更多
        tracks.sort()
        print(f"目录 '{target_dir.name}' 包含 {len(tracks)} 首歌曲")
        return self.play_track(tracks[0])
    
    def stop_if_playing(self):
        """停止当前播放"""
        stopped = False
        if self.current_process:
            try:
                # 检查进程是否仍在运行
                if self.current_process.poll() is None:
                    self.current_process.terminate()
                    print("播放已停止")
                    stopped = True
                else:
                    print("播放进程已经结束")
            except Exception as e:
                print(f"停止播放时出错: {e}")
            finally:
                self.current_process = None
        
        # 清除PID文件
        self._clear_pid()
        
        if not stopped:
            print("没有正在播放的音乐")

    def show_library_info(self):
        """显示音乐库信息"""
        tracks = self.scan_music()
        dirs = [d for d in self.music_dir.iterdir() if d.is_dir()]
        
        print(f"音乐库统计:")
        print(f"   总歌曲数: {len(tracks)}")
        print(f"   目录数: {len(dirs)}")
        
        if dirs:
            print(f"   热门目录:")
            # 按目录中的文件数排序，显示前5个
            dir_counts = {}
            for track in tracks:
                parent = str(track.relative_to(self.music_dir).parent)
                if parent != '.':  # 忽略根目录
                    dir_counts[parent] = dir_counts.get(parent, 0) + 1
            
            sorted_dirs = sorted(dir_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            for dir_name, count in sorted_dirs:
                print(f"     - {dir_name}: {count} 首")
        
        if tracks:
            print(f"   示例歌曲:")
            for track in tracks[:3]:  # 显示前3首
                rel_path = track.relative_to(self.music_dir)
                print(f"     - {rel_path}")


# 便捷函数
def handle_music_command(command: str, args: str = ""):
    """处理音乐命令"""
    controller = SimpleMusicController()
    
    if command == "search" and args:
        results = controller.search_tracks(args)
        if results:
            print(f"找到 {len(results)} 首相关歌曲:")
            for i, track in enumerate(results[:10]):  # 只显示前10首
                rel_path = track.relative_to(controller.music_dir)
                print(f"  {i+1}. {rel_path}")
            
            # 自动播放第一首
            if results:
                print(f"\n自动播放第一首...")
                controller.play_track(results[0])
        else:
            print(f"未找到包含 '{args}' 的歌曲")
    
    elif command == "random":
        controller.play_random()
    
    elif command == "directory" and args:
        controller.play_directory(args)
    
    elif command == "info":
        controller.show_library_info()
    
    elif command == "stop":
        controller.stop_if_playing()


if __name__ == "__main__":
    # 用于测试
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        args = sys.argv[2] if len(sys.argv) > 2 else ""
        handle_music_command(cmd, args)
    else:
        controller = SimpleMusicController()
        controller.show_library_info()