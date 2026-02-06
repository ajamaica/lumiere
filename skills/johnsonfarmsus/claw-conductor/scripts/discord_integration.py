#!/usr/bin/env python3
"""
Discord Integration for Claw Conductor

Handles Discord channel detection and workspace mapping.
Maps Discord channels to project folders automatically.
"""

import json
import os
from pathlib import Path
from typing import Dict, Optional, Tuple


class DiscordIntegration:
    """Manages Discord channel to project workspace mapping"""

    def __init__(self, config_path: str = None):
        """
        Initialize Discord integration

        Args:
            config_path: Path to conductor-config.json
        """
        if config_path is None:
            config_path = str(Path(__file__).parent.parent / 'config' / 'conductor-config.json')

        # Load configuration
        with open(config_path, 'r') as f:
            config = json.load(f)

        self.config = config.get('discord', {})
        self.enabled = self.config.get('enabled', True)
        self.auto_detect = self.config.get('auto_detect', True)
        self.projects_dir = Path(self.config.get('projects_dir', '/root/projects'))

        # Load channel mapping
        mapping_file = self.config.get('channel_mapping_file', 'channel-workspace-map.json')
        self.mapping_path = Path(__file__).parent.parent / 'config' / mapping_file
        self.channel_map = self._load_channel_mapping()

    def _load_channel_mapping(self) -> Dict:
        """Load channel to workspace mapping from file"""
        if not self.mapping_path.exists():
            return {}

        try:
            with open(self.mapping_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load channel mapping: {e}")
            return {}

    def _save_channel_mapping(self):
        """Save channel mapping to file"""
        self.mapping_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.mapping_path, 'w') as f:
            json.dump(self.channel_map, f, indent=2)

    def detect_context(self, channel_id: str = None, channel_name: str = None,
                       project_name: str = None) -> Dict:
        """
        Detect execution context (Discord vs direct invocation)

        Args:
            channel_id: Discord channel ID (if available)
            channel_name: Discord channel name (if available)
            project_name: Project name (fallback if not Discord)

        Returns:
            Context dict with source, project, workspace info
        """
        if not self.enabled:
            # Discord disabled, use direct parameters
            return self._direct_context(project_name)

        # Try to detect from environment first
        if channel_id is None:
            channel_id = os.getenv('DISCORD_CHANNEL_ID')
        if channel_name is None:
            channel_name = os.getenv('DISCORD_CHANNEL_NAME')

        # If we have Discord info, use it
        if channel_id or channel_name:
            return self._discord_context(channel_id, channel_name)

        # Fallback to direct invocation
        return self._direct_context(project_name)

    def _discord_context(self, channel_id: str = None,
                        channel_name: str = None) -> Dict:
        """
        Build context from Discord channel information

        Args:
            channel_id: Discord channel ID
            channel_name: Discord channel name

        Returns:
            Context dictionary
        """
        # Try to find mapping
        if channel_id and channel_id in self.channel_map:
            mapping = self.channel_map[channel_id]
            return {
                'source': 'discord',
                'channel_id': channel_id,
                'channel_name': mapping['channel_name'],
                'project': mapping['project_name'],
                'workspace': Path(mapping['workspace']),
                'github_repo': mapping.get('github_repo')
            }

        # Try to map by channel name
        if channel_name:
            # Remove # prefix if present
            clean_name = channel_name.lstrip('#')

            # Check if workspace exists
            workspace = self.projects_dir / clean_name
            if workspace.exists():
                # Auto-register this channel
                if channel_id:
                    self._register_channel(channel_id, clean_name, str(workspace))

                return {
                    'source': 'discord',
                    'channel_id': channel_id,
                    'channel_name': clean_name,
                    'project': clean_name,
                    'workspace': workspace,
                    'github_repo': None
                }

        # Discord channel but no mapping found
        return {
            'source': 'discord',
            'channel_id': channel_id,
            'channel_name': channel_name,
            'project': None,
            'workspace': None,
            'error': 'No workspace found for this Discord channel'
        }

    def _direct_context(self, project_name: str = None) -> Dict:
        """
        Build context for direct invocation (not Discord)

        Args:
            project_name: Project name

        Returns:
            Context dictionary
        """
        if not project_name:
            return {
                'source': 'direct',
                'project': None,
                'workspace': None,
                'error': 'No project name specified'
            }

        workspace = self.projects_dir / project_name

        return {
            'source': 'direct',
            'project': project_name,
            'workspace': workspace,
            'github_repo': None
        }

    def _register_channel(self, channel_id: str, channel_name: str,
                         workspace: str, github_repo: str = None):
        """
        Register a Discord channel → workspace mapping

        Args:
            channel_id: Discord channel ID
            channel_name: Channel name
            workspace: Workspace path
            github_repo: Optional GitHub repo
        """
        self.channel_map[channel_id] = {
            'channel_name': channel_name,
            'project_name': channel_name,
            'workspace': workspace,
            'github_repo': github_repo
        }
        self._save_channel_mapping()

    def sync_from_projects(self) -> Tuple[int, int]:
        """
        Sync channel mappings from /root/projects directory

        Returns:
            Tuple of (new_projects, total_projects)
        """
        if not self.projects_dir.exists():
            return (0, 0)

        new_count = 0
        total_count = 0

        # Scan for project directories
        for project_dir in self.projects_dir.iterdir():
            if not project_dir.is_dir():
                continue
            if project_dir.name.startswith('.'):
                continue

            total_count += 1

            # Check if already mapped (by workspace path)
            already_mapped = any(
                mapping['workspace'] == str(project_dir)
                for mapping in self.channel_map.values()
            )

            if not already_mapped:
                # Create synthetic channel ID for tracking
                # (will be replaced when actual Discord channel is detected)
                synthetic_id = f"project_{project_dir.name}"
                self._register_channel(
                    synthetic_id,
                    project_dir.name,
                    str(project_dir)
                )
                new_count += 1

        return (new_count, total_count)

    def get_all_projects(self) -> list:
        """
        Get list of all mapped projects

        Returns:
            List of project info dicts
        """
        projects = []
        for channel_id, mapping in self.channel_map.items():
            projects.append({
                'channel_id': channel_id,
                'channel_name': mapping['channel_name'],
                'project_name': mapping['project_name'],
                'workspace': mapping['workspace'],
                'github_repo': mapping.get('github_repo'),
                'is_synthetic': channel_id.startswith('project_')
            })
        return projects


# Standalone functions for easy import
def detect_discord_context(channel_id: str = None, channel_name: str = None,
                          project_name: str = None) -> Dict:
    """
    Convenience function to detect context

    Args:
        channel_id: Discord channel ID
        channel_name: Discord channel name
        project_name: Project name (fallback)

    Returns:
        Context dictionary
    """
    integration = DiscordIntegration()
    return integration.detect_context(channel_id, channel_name, project_name)


if __name__ == '__main__':
    # Test the integration
    integration = DiscordIntegration()

    print("=== Discord Integration Test ===\n")

    # Test direct invocation
    context = integration.detect_context(project_name='test-project')
    print("Direct invocation:")
    print(json.dumps(context, indent=2, default=str))

    # Test Discord invocation
    print("\nDiscord invocation:")
    context = integration.detect_context(channel_name='scientific-calculator')
    print(json.dumps(context, indent=2, default=str))

    # Sync from projects
    print("\nSyncing from projects...")
    new, total = integration.sync_from_projects()
    print(f"New: {new}, Total: {total}")

    # List all projects
    print("\nAll projects:")
    for project in integration.get_all_projects():
        print(f"  - {project['project_name']} ({project['workspace']})")
