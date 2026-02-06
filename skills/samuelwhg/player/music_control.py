#!/usr/bin/env python3
"""
音乐播放控制模块
用于OpenClaw系统的音乐播放功能
"""

import os
import subprocess
import sys
import random
from pathlib import Path
from typing import List, Optional


import psutil
import time

class MusicController:
    def __init__(self):
        self.mpv_path = r"E:\software\mpv-x86_64\mpv.exe"
        self.music_dir = Path(r"F:\Music")
        self.current_process = None
        self.last_playlist = []
        self.pid_file = Path(r"E:\Workspace\AI\openclaw\skills\music-player\current_pid.txt")
        
        # 验证路径
        if not os.path.exists(self.mpv_path):
            raise FileNotFoundError(f"MPV播放器未找到: {self.mpv_path}")
        if not self.music_dir.exists():
            raise FileNotFoundError(f"音乐目录未找到: {self.music_dir}")
        
        # 检查是否有之前的播放进程
        self._check_existing_process()
    
    def _check_existing_process(self):
        """检查是否有现有的mpv播放进程"""
        try:
            # 检查PID文件
            if self.pid_file.exists():
                try:
                    with open(self.pid_file, 'r') as f:
                        pid = int(f.read().strip())
                    
                    # 检查进程是否存在
                    if psutil.pid_exists(pid):
                        proc = psutil.Process(pid)
                        if 'mpv' in proc.name().lower():
                            self.current_process = proc
                            print(f"检测到正在运行的播放进程 (PID: {pid})")
                        else:
                            # 不是mpv进程，删除PID文件
                            self.pid_file.unlink()
                    else:
                        # 进程不存在，删除PID文件
                        self.pid_file.unlink()
                except (ValueError, psutil.NoSuchProcess):
                    # PID文件损坏或进程不存在
                    if self.pid_file.exists():
                        self.pid_file.unlink()
            
            # 如果仍然没有找到进程，尝试通过进程名查找
            if self.current_process is None:
                for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                    try:
                        if 'mpv' in proc.info['name'].lower():
                            # 检查命令行是否包含音乐目录的路径
                            cmdline = ' '.join(proc.info['cmdline']).lower() if proc.info['cmdline'] else ''
                            if 'f:\\music' in cmdline or '/music' in cmdline.replace('\\', '/'):
                                self.current_process = proc
                                print(f"发现mpv播放进程 (PID: {proc.info['pid']})")
                                # 保存PID
                                with open(self.pid_file, 'w') as f:
                                    f.write(str(proc.info['pid']))
                                break
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
        except Exception as e:
            print(f"检查现有进程时出错: {e}")
    
    def _save_pid(self, proc):
        """保存进程ID到文件"""
        try:
            with open(self.pid_file, 'w') as f:
                f.write(str(proc.pid))
        except Exception as e:
            print(f"保存PID文件时出错: {e}")
    
    def _clear_pid(self):
        """清除PID文件"""
        try:
            if self.pid_file.exists():
                self.pid_file.unlink()
        except Exception as e:
            print(f"清除PID文件时出错: {e}")
    
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
            self.stop_if_playing()
            cmd = [str(self.mpv_path), "--", str(track_path)]
            self.current_process = subprocess.Popen(cmd)
            print(f"开始播放: {track_path.name}")
            # 保存进程ID
            self._save_pid(self.current_process)
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
        self.last_playlist = tracks
        print(f"目录 '{target_dir.name}' 包含 {len(tracks)} 首歌曲")
        return self.play_track(tracks[0])
    
    def stop_if_playing(self):
        """停止当前播放"""
        if self.current_process:
            try:
                # 如果是psutil.Process对象
                if hasattr(self.current_process, 'terminate'):
                    self.current_process.terminate()
                # 如果是subprocess.Popen对象
                else:
                    self.current_process.terminate()
                
                self.current_process = None
                print("播放已停止")
                # 清除PID文件
                self._clear_pid()
            except Exception as e:
                print(f"停止播放时出错: {e}")
                self.current_process = None
                self._clear_pid()
        else:
            # 尝试查找并终止任何可能的mpv进程
            try:
                for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                    try:
                        if 'mpv' in proc.info['name'].lower():
                            # 检查命令行是否包含音乐目录的路径
                            cmdline = ' '.join(proc.info['cmdline']).lower() if proc.info['cmdline'] else ''
                            if 'f:\\music' in cmdline or '/music' in cmdline.replace('\\', '/'):
                                proc.terminate()
                                print(f"终止了mpv进程 (PID: {proc.info['pid']})")
                                self._clear_pid()
                                break
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
            except Exception as e:
                print(f"查找并终止mpv进程时出错: {e}")
    
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
    controller = MusicController()
    
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
        controller = MusicController()
        controller.show_library_info()