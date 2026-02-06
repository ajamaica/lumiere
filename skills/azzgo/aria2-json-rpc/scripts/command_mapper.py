#!/usr/bin/env python3
"""
Natural language command mapping for aria2-json-rpc skill.

Maps natural language commands to aria2 RPC methods with parameter extraction.
Enables AI agents to interpret commands like:
- "download http://example.com/file.zip"
- "show status for GID 2089b05ecca3d829"
- "remove download 2089b05ecca3d829"
- "show global stats"
"""

import re
from typing import Dict, List, Any, Optional, Tuple


class CommandMapper:
    """
    Maps natural language commands to aria2 RPC method calls.

    Uses keyword detection and pattern matching for intent classification.
    """

    # Milestone 1 command patterns
    PATTERNS = {
        # addUri patterns - order matters, most specific first
        "add_uri": [
            r"^download\s+(https?://\S+|ftp://\S+|magnet:\S+|sftp://\S+)",
            r"^add\s+(?:download\s+)?(?:uri\s+)?(https?://\S+|ftp://\S+|magnet:\S+)",
            r"^fetch\s+(https?://\S+|ftp://\S+|sftp://\S+)",
        ],
        # tellStatus patterns - require full GID
        "tell_status": [
            r"^(?:show|get|check)\s+status\s+(?:for\s+)?(?:gid\s+)?([a-f0-9]{16})",
            r"^status\s+of\s+(?:gid\s+)?([a-f0-9]{16})",
        ],
        # remove patterns - require full GID
        "remove": [
            r"^remove\s+(?:download\s+)?(?:gid\s+)?([a-f0-9]{16})",
            r"^delete\s+(?:download\s+)?(?:gid\s+)?([a-f0-9]{16})",
            r"^cancel\s+(?:download\s+)?(?:gid\s+)?([a-f0-9]{16})",
        ],
        # getGlobalStat patterns - no parameters
        "get_global_stat": [
            r"^(?:show|get|display)\s+global\s+(?:stats?|statistics)",
            r"^(?:show|get)\s+(?:overall|all)\s+(?:stats?|statistics)",
            r"^what'?s\s+downloading\??$",
            r"^how\s+many\s+(?:downloads?|tasks?)\??$",
        ],
        # Milestone 2: pause patterns
        "pause": [
            r"^pause\s+(?:download\s+)?(?:gid\s+)?([a-f0-9]{16})",
            r"^stop\s+(?:download\s+)?(?:gid\s+)?([a-f0-9]{16})",
        ],
        # Milestone 2: pauseAll patterns
        "pause_all": [
            r"^pause\s+all\s+(?:downloads?|tasks?)",
            r"^stop\s+all\s+(?:downloads?|tasks?)",
            r"^pause\s+everything",
        ],
        # Milestone 2: unpause patterns
        "unpause": [
            r"^(?:unpause|resume)\s+(?:download\s+)?(?:gid\s+)?([a-f0-9]{16})",
            r"^continue\s+(?:download\s+)?(?:gid\s+)?([a-f0-9]{16})",
        ],
        # Milestone 2: unpauseAll patterns
        "unpause_all": [
            r"^(?:unpause|resume)\s+all\s+(?:downloads?|tasks?)",
            r"^continue\s+all\s+(?:downloads?|tasks?)",
            r"^(?:unpause|resume)\s+everything",
        ],
        # Milestone 2: tellActive patterns
        "tell_active": [
            r"^(?:show|list|get)\s+active\s+(?:downloads?|tasks?)",
            r"^what'?s\s+(?:currently\s+)?(?:downloading|active)",
            r"^active\s+(?:downloads?|tasks?)",
        ],
        # Milestone 2: tellWaiting patterns
        "tell_waiting": [
            r"^(?:show|list|get)\s+waiting\s+(?:downloads?|tasks?)",
            r"^(?:show|list|get)\s+queued?\s+(?:downloads?|tasks?)",
            r"^waiting\s+(?:downloads?|tasks?)",
        ],
        # Milestone 2: tellStopped patterns
        "tell_stopped": [
            r"^(?:show|list|get)\s+stopped\s+(?:downloads?|tasks?)",
            r"^(?:show|list|get)\s+(?:completed?|finished)\s+(?:downloads?|tasks?)",
            r"^stopped\s+(?:downloads?|tasks?)",
        ],
        # Milestone 2: getOption patterns
        "get_option": [
            r"^(?:show|get)\s+options?\s+(?:for\s+)?(?:gid\s+)?([a-f0-9]{16})",
            r"^options?\s+(?:of|for)\s+(?:gid\s+)?([a-f0-9]{16})",
        ],
        # Milestone 2: changeOption patterns - complex, need GID + options
        "change_option": [
            r"^(?:change|set|modify)\s+options?\s+(?:for\s+)?(?:gid\s+)?([a-f0-9]{16})",
        ],
        # Milestone 2: getGlobalOption patterns
        "get_global_option": [
            r"^(?:show|get)\s+global\s+options?",
            r"^global\s+options?",
        ],
        # Milestone 2: changeGlobalOption patterns
        "change_global_option": [
            r"^(?:change|set|modify)\s+global\s+options?",
        ],
        # Milestone 2: purgeDownloadResult patterns
        "purge_download_result": [
            r"^purge\s+(?:download\s+)?(?:results?|history)",
            r"^clear\s+(?:download\s+)?(?:results?|history)",
            r"^clean\s+up\s+(?:completed?|finished)\s+downloads?",
        ],
        # Milestone 2: removeDownloadResult patterns
        "remove_download_result": [
            r"^remove\s+(?:download\s+)?result\s+(?:for\s+)?(?:gid\s+)?([a-f0-9]{16})",
            r"^clear\s+(?:download\s+)?result\s+(?:for\s+)?(?:gid\s+)?([a-f0-9]{16})",
        ],
        # Milestone 2: getVersion patterns
        "get_version": [
            r"^(?:show|get)\s+(?:aria2\s+)?version",
            r"^version\s+info(?:rmation)?",
            r"^what\s+version\s+of\s+aria2",
        ],
        # Milestone 2: listMethods patterns
        "list_methods": [
            r"^(?:show|list|get)\s+(?:available\s+)?(?:rpc\s+)?methods?",
            r"^what\s+methods?\s+are\s+available",
            r"^available\s+(?:rpc\s+)?methods?",
        ],
        # Milestone 3: addTorrent patterns
        "add_torrent": [
            r"^(?:add|download)\s+torrent\s+(.+\.torrent)",
            r"^download\s+from\s+torrent\s+(.+\.torrent)",
            r"^(?:add|start)\s+bittorrent\s+(.+\.torrent)",
        ],
        # Milestone 3: addMetalink patterns
        "add_metalink": [
            r"^(?:add|download)\s+metalink\s+(.+\.metalink)",
            r"^download\s+from\s+metalink\s+(.+\.metalink)",
        ],
    }

    def __init__(self):
        """Initialize the command mapper."""
        self.compiled_patterns = {}
        self._compile_patterns()

    def _compile_patterns(self):
        """Compile regex patterns for faster matching."""
        for method, patterns in self.PATTERNS.items():
            self.compiled_patterns[method] = [
                re.compile(pattern, re.IGNORECASE) for pattern in patterns
            ]

    def map_command(self, command: str) -> Optional[Tuple[str, List[Any]]]:
        """
        Map a natural language command to an aria2 RPC method and parameters.

        Args:
            command: Natural language command string

        Returns:
            Tuple of (method_name, params) if matched, None otherwise
            Example: ("aria2.addUri", [["http://example.com/file.zip"]])
        """
        command = command.strip()

        # Try each method's patterns
        for method, compiled_patterns in self.compiled_patterns.items():
            for pattern in compiled_patterns:
                match = pattern.search(command)
                if match:
                    # Extract parameters based on method
                    params = self._extract_params(method, match, command)
                    rpc_method = self._method_to_rpc(method)
                    return (rpc_method, params)

        return None

    def _method_to_rpc(self, method: str) -> str:
        """Convert internal method name to aria2 RPC method name."""
        mapping = {
            # Milestone 1
            "add_uri": "aria2.addUri",
            "tell_status": "aria2.tellStatus",
            "remove": "aria2.remove",
            "get_global_stat": "aria2.getGlobalStat",
            # Milestone 2
            "pause": "aria2.pause",
            "pause_all": "aria2.pauseAll",
            "unpause": "aria2.unpause",
            "unpause_all": "aria2.unpauseAll",
            "tell_active": "aria2.tellActive",
            "tell_waiting": "aria2.tellWaiting",
            "tell_stopped": "aria2.tellStopped",
            "get_option": "aria2.getOption",
            "change_option": "aria2.changeOption",
            "get_global_option": "aria2.getGlobalOption",
            "change_global_option": "aria2.changeGlobalOption",
            "purge_download_result": "aria2.purgeDownloadResult",
            "remove_download_result": "aria2.removeDownloadResult",
            "get_version": "aria2.getVersion",
            "list_methods": "system.listMethods",
            # Milestone 3
            "add_torrent": "aria2.addTorrent",
            "add_metalink": "aria2.addMetalink",
        }
        return mapping.get(method, method)

    def _extract_params(self, method: str, match: re.Match, command: str) -> List[Any]:
        """
        Extract parameters from regex match based on method type.

        Args:
            method: Internal method name
            match: Regex match object
            command: Original command string

        Returns:
            List of parameters for RPC method
        """
        # Milestone 1 methods
        if method == "add_uri":
            # Extract URIs (single URI from match group)
            uri = match.group(1).strip()
            # Return as array of URIs (aria2.addUri expects array of URIs)
            return [[uri]]

        elif method == "tell_status":
            # Extract GID
            gid = match.group(1).strip()
            return [gid]

        elif method == "remove":
            # Extract GID
            gid = match.group(1).strip()
            return [gid]

        elif method == "get_global_stat":
            # No parameters needed
            return []

        # Milestone 2 methods
        elif method == "pause":
            # Extract GID
            gid = match.group(1).strip()
            return [gid]

        elif method == "pause_all":
            # No parameters needed
            return []

        elif method == "unpause":
            # Extract GID
            gid = match.group(1).strip()
            return [gid]

        elif method == "unpause_all":
            # No parameters needed
            return []

        elif method == "tell_active":
            # No parameters needed (can optionally add keys parameter)
            return []

        elif method == "tell_waiting":
            # Default pagination: offset=0, num=100
            return [0, 100]

        elif method == "tell_stopped":
            # Default pagination: offset=0, num=100
            return [0, 100]

        elif method == "get_option":
            # Extract GID
            gid = match.group(1).strip()
            return [gid]

        elif method == "change_option":
            # Extract GID (options would need to be provided separately)
            gid = match.group(1).strip()
            return [gid, {}]  # Empty options dict as placeholder

        elif method == "get_global_option":
            # No parameters needed
            return []

        elif method == "change_global_option":
            # Empty options dict as placeholder
            return [{}]

        elif method == "purge_download_result":
            # No parameters needed
            return []

        elif method == "remove_download_result":
            # Extract GID
            gid = match.group(1).strip()
            return [gid]

        elif method == "get_version":
            # No parameters needed
            return []

        elif method == "list_methods":
            # No parameters needed
            return []

        # Milestone 3 methods
        elif method == "add_torrent":
            # Extract torrent file path
            torrent_path = match.group(1).strip()
            return [torrent_path]

        elif method == "add_metalink":
            # Extract metalink file path
            metalink_path = match.group(1).strip()
            return [metalink_path]

        return []

    def _looks_like_uri(self, text: str) -> bool:
        """Check if text looks like a URI."""
        # Check for common URI schemes
        uri_schemes = ["http://", "https://", "ftp://", "sftp://", "magnet:", "file://"]
        text_lower = text.lower()

        for scheme in uri_schemes:
            if text_lower.startswith(scheme):
                return True

        # Check for common file extensions (might be relative path or filename)
        if any(
            text.endswith(ext)
            for ext in [".zip", ".tar", ".gz", ".iso", ".mp4", ".pdf", ".torrent"]
        ):
            return True

        return False

    def get_supported_commands(self) -> Dict[str, List[str]]:
        """
        Get documentation of supported commands.

        Returns:
            Dictionary mapping method names to example commands
        """
        return {
            # Milestone 1
            "add_uri": [
                "download http://example.com/file.zip",
                "add download https://example.com/file.iso",
                "fetch ftp://mirror.org/archive.tar.gz",
            ],
            "tell_status": [
                "show status for GID 2089b05ecca3d829",
                "status of 2089b05ecca3d829",
                "check status 2089b05ecca3d829",
            ],
            "remove": [
                "remove download 2089b05ecca3d829",
                "delete 2089b05ecca3d829",
                "cancel download 2089b05ecca3d829",
            ],
            "get_global_stat": [
                "show global stats",
                "get global statistics",
                "what's downloading",
                "how many downloads",
            ],
            # Milestone 2
            "pause": [
                "pause download 2089b05ecca3d829",
                "pause GID 2089b05ecca3d829",
                "stop download 2089b05ecca3d829",
            ],
            "pause_all": [
                "pause all downloads",
                "stop all tasks",
                "pause everything",
            ],
            "unpause": [
                "unpause download 2089b05ecca3d829",
                "resume GID 2089b05ecca3d829",
                "continue download 2089b05ecca3d829",
            ],
            "unpause_all": [
                "unpause all downloads",
                "resume all tasks",
                "continue everything",
            ],
            "tell_active": [
                "show active downloads",
                "list active tasks",
                "what's currently downloading",
            ],
            "tell_waiting": [
                "show waiting downloads",
                "list queued tasks",
                "waiting downloads",
            ],
            "tell_stopped": [
                "show stopped downloads",
                "list completed tasks",
                "stopped downloads",
            ],
            "get_option": [
                "show options for GID 2089b05ecca3d829",
                "get options 2089b05ecca3d829",
            ],
            "change_option": [
                "change options for GID 2089b05ecca3d829",
                "set options 2089b05ecca3d829",
            ],
            "get_global_option": [
                "show global options",
                "get global options",
            ],
            "change_global_option": [
                "change global options",
                "set global options",
            ],
            "purge_download_result": [
                "purge download results",
                "clear download history",
                "clean up completed downloads",
            ],
            "remove_download_result": [
                "remove download result 2089b05ecca3d829",
                "clear result for GID 2089b05ecca3d829",
            ],
            "get_version": [
                "show aria2 version",
                "get version",
                "what version of aria2",
            ],
            "list_methods": [
                "show available methods",
                "list RPC methods",
                "what methods are available",
            ],
            # Milestone 3
            "add_torrent": [
                "add torrent /path/to/file.torrent",
                "download torrent ubuntu-20.04.torrent",
                "download from torrent movie.torrent",
            ],
            "add_metalink": [
                "add metalink file.metalink",
                "download metalink archive.metalink",
                "download from metalink package.metalink",
            ],
        }


def main():
    """Test command mapping."""
    print("Testing natural language command mapper...")
    print()

    mapper = CommandMapper()

    # Test commands
    test_commands = [
        "download http://example.com/file.zip",
        "download http://example.com/file1.zip http://example.com/file2.zip",
        "show status for GID 2089b05ecca3d829",
        "status of abc123def456",
        "remove download 2089b05ecca3d829",
        "show global stats",
        "what's downloading",
        "this should not match anything",
    ]

    for command in test_commands:
        result = mapper.map_command(command)
        if result:
            method, params = result
            print(f"✓ '{command}'")
            print(f"  → {method}")
            print(f"  → params: {params}")
        else:
            print(f"✗ '{command}'")
            print(f"  → No match")
        print()

    # Show supported commands
    print("Supported Commands:")
    print()
    for method, examples in mapper.get_supported_commands().items():
        print(f"{method}:")
        for example in examples:
            print(f"  - {example}")
        print()


if __name__ == "__main__":
    main()
