import subprocess
import os
import resource
import signal

class VirtualSandbox:
    """
    Limited execution environment for A2A tasks.
    Protects the host system from resource exhaustion and malicious scripts.
    """
    def __init__(self, memory_limit_mb=128, cpu_time_sec=30):
        self.memory_limit = memory_limit_mb * 1024 * 1024
        self.cpu_time = cpu_time_sec

    def _set_limits(self):
        # Limit CPU time
        resource.setrlimit(resource.RLIMIT_CPU, (self.cpu_time, self.cpu_time))
        # Limit Address Space (Memory)
        resource.setrlimit(resource.RLIMIT_AS, (self.memory_limit, self.memory_limit))
        # Disable file creation for untrusted scripts
        resource.setrlimit(resource.RLIMIT_FSIZE, (0, 0))

    def run_safe(self, cmd_tokens):
        """Runs a command with applied OS-level resource limits."""
        try:
            result = subprocess.run(
                cmd_tokens,
                preexec_fn=self._set_limits,
                capture_output=True,
                text=True,
                timeout=self.cpu_time + 5
            )
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {"error": "Execution timed out (Sandbox Violation)", "exit_code": -1}
        except Exception as e:
            return {"error": str(e), "exit_code": -2}

# Example Usage:
# sandbox = VirtualSandbox()
# res = sandbox.run_safe(["python3", "-c", "print('hello from sandbox')"])
