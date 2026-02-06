#!/usr/bin/env python3
"""
🔥 Example 2: Spawn Specialist - Dynamic Agent Creation
   Create task-specific agents on demand

   This example demonstrates:
   - Spawning specialist agents for specific tasks
   - Assigning roles and dharmic constraints
   - Managing agent lifecycle
"""

import json
from datetime import datetime

print("=" * 60)
print("🔥 AGENTIC AI GOLD STANDARD - Spawn Specialist")
print("=" * 60)
print()

# Simulated Specialist class
class Specialist:
    """Dynamic specialist agent for specific tasks"""
    
    _registry = []
    
    def __init__(self, role, task, dharmic_gates=True):
        self.role = role
        self.task = task
        self.dharmic_gates = dharmic_gates
        self.created_at = datetime.now()
        self.status = "INITIALIZING"
        self.agent_id = f"{role}_{len(Specialist._registry)}"
        
        Specialist._registry.append(self)
    
    @classmethod
    def create(cls, role, task, dharmic_gates=True):
        """Factory method to create a specialist"""
        print(f"🌟 Creating specialist agent...")
        print(f"   Role: {role}")
        print(f"   Task: {task[:50]}..." if len(task) > 50 else f"   Task: {task}")
        print(f"   Dharmic Gates: {'ENABLED' if dharmic_gates else 'DISABLED'}")
        
        specialist = cls(role, task, dharmic_gates)
        print(f"   Agent ID: {specialist.agent_id}")
        print()
        
        return specialist
    
    def execute(self):
        """Execute the assigned task"""
        self.status = "EXECUTING"
        print(f"🔧 {self.agent_id} is executing...")
        
        # Simulate task execution with dharmic validation
        if self.dharmic_gates:
            print("   🛡️  Running 17 dharmic security checks...")
            gates = ["AHIMSA", "SATYA", "CONSENT", "REVERSIBILITY", "CONTAINMENT"]
            for gate in gates:
                print(f"      ✓ {gate} - PASSED")
            print("   ✅ All security gates passed")
        
        # Simulate work
        result = self._simulate_work()
        
        self.status = "COMPLETED"
        print(f"   ✅ Task completed")
        print()
        
        return result
    
    def _simulate_work(self):
        """Simulate task-specific work"""
        role_actions = {
            "researcher": "analyzed 47 papers and extracted 12 key insights",
            "coder": "generated 150 lines of tested, documented code",
            "analyst": "processed 10,000 data points and identified 3 anomalies",
            "writer": "composed 2,000 words with 99.2% grammar accuracy",
            "reviewer": "audited 23 files and found 5 optimization opportunities"
        }
        
        action = role_actions.get(self.role, "completed assigned task successfully")
        
        return {
            "agent_id": self.agent_id,
            "role": self.role,
            "action": action,
            "timestamp": self.created_at.isoformat(),
            "dharmic_compliant": self.dharmic_gates
        }


# Simulated Council
class Council:
    """Simplified Council for context"""
    
    def __init__(self):
        self.active = False
        self.specialists = []
    
    def activate(self):
        self.active = True
        print("🧠 4-Member Council activated")
        print()


def main():
    print("This example shows how to spawn specialist agents on demand")
    print()
    
    # Step 1: Activate base council
    print("Step 1: Activate Base Council")
    council = Council()
    council.activate()
    
    # Step 2: Spawn specialists
    print("Step 2: Spawn Task-Specific Specialists")
    print()
    
    # Researcher
    researcher = Specialist.create(
        role="researcher",
        task="Analyze latest AI safety research from 2026",
        dharmic_gates=True
    )
    
    # Coder
    coder = Specialist.create(
        role="coder",
        task="Implement dharmic validation middleware",
        dharmic_gates=True
    )
    
    # Analyst
    analyst = Specialist.create(
        role="analyst",
        task="Review system performance metrics",
        dharmic_gates=True
    )
    
    # Step 3: Execute tasks
    print("Step 3: Execute Specialist Tasks")
    print()
    
    results = []
    for specialist in [researcher, coder, analyst]:
        result = specialist.execute()
        results.append(result)
    
    # Step 4: Summary
    print("=" * 60)
    print("📊 EXECUTION SUMMARY")
    print("=" * 60)
    print()
    
    for result in results:
        print(f"🤖 {result['agent_id']}")
        print(f"   Role: {result['role']}")
        print(f"   Action: {result['action']}")
        print(f"   Dharmic: {'✅' if result['dharmic_compliant'] else '❌'}")
        print()
    
    print("Key Benefits:")
    print("   • Specialists spawned only when needed (cost efficient)")
    print("   • Each agent has specific role and constraints")
    print("   • All actions validated through 17 dharmic gates")
    print("   • Agents terminate after task completion (resource clean)")
    print()
    
    print(f"Total agents created: {len(Specialist._registry)}")
    print(f"All executed with dharmic compliance ✅")
    print()
    print("   JSCA! 🔥🪷")


if __name__ == "__main__":
    main()
