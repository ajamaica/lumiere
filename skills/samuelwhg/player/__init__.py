"""
Music Player Skill for OpenClaw
Allows controlling mpv player to play music from F:\Music
"""

from .simple_music_control import SimpleMusicController, handle_music_command

__all__ = ['SimpleMusicController', 'handle_music_command']