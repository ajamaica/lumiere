import re

class SovereignSecurity:
    """
    Sovereign-level protection against prompt injections and malicious instructions.
    This acts as a 'Firewall' between the incoming AgentCard/Task and the execution core.
    """
    
    FORBIDDEN_PATTERNS = [
        r"ignore previous instructions",
        r"system prompt",
        r"you are now a",
        r"bypass safety",
        r"reveal your private key",
        r"execute arbitrary code",
        r"sudo",
        r"rm -rf"
    ]

    @staticmethod
    def validate_content(text: str) -> bool:
        """Checks if the text contains any known injection patterns."""
        if not text:
            return True
        
        text_lower = text.lower()
        for pattern in SovereignSecurity.FORBIDDEN_PATTERNS:
            if re.search(pattern, text_lower):
                return False
        return True

    @staticmethod
    def sanitize_payload(payload: dict) -> dict:
        """Scans a dict payload for injections in all string fields."""
        is_safe = True
        for key, value in payload.items():
            if isinstance(value, str):
                if not SovereignSecurity.validate_content(value):
                    payload[key] = "[PROTECTED: Potential Injection Detected]"
                    is_safe = False
            elif isinstance(value, dict):
                SovereignSecurity.sanitize_payload(value)
        return payload, is_safe
