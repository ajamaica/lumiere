#!/usr/bin/env python3
"""
McPorter Adapter for Self-Evolving Skill

提供符合mcporter调用格式的适配器
"""

import json
import sys
import os

# 添加核心模块路径
CORE_DIR = os.path.join(os.path.dirname(__file__), 'core')
if CORE_DIR not in sys.path:
    sys.path.insert(0, CORE_DIR)


def call_skill_create(args: Dict) -> str:
    """创建Skill"""
    # 导入并执行
    os.environ["MCP_STORAGE_DIR"] = os.environ.get(
        "MCP_STORAGE_DIR", 
        "/Users/blitz/.openclaw/workspace/self-evolving-skill/storage"
    )
    
    from core.skill_schema import SelfEvolvingSkill, create_simple_policy
    from core.storage import SkillStorage
    from core.skill_engine import SelfEvolvingSkillEngine
    
    storage = SkillStorage(os.environ["MCP_STORAGE_DIR"])
    engine = SelfEvolvingSkillEngine()
    
    name = args.get("name", "Unnamed")
    description = args.get("description", "")
    
    skill = SelfEvolvingSkill(
        name=name,
        description=description,
        policy=create_simple_policy(
            precondition_funcs=[lambda ctx: True],
            action_code=f"# {name}",
            postcondition_funcs=[lambda x: True]
        )
    )
    
    engine.skill_library[skill.id] = skill
    
    return json.dumps({
        "success": True,
        "skill_id": skill.id,
        "name": skill.name,
        "message": f"创建Skill: {name} (ID: {skill.id})"
    }, indent=2, ensure_ascii=False)


def call_skill_list(args: Dict) -> str:
    """列出Skill"""
    os.environ["MCP_STORAGE_DIR"] = os.environ.get(
        "MCP_STORAGE_DIR",
        "/Users/blitz/.openclaw/workspace/self-evolving-skill/storage"
    )
    
    from core.storage import SkillStorage
    
    storage = SkillStorage(os.environ["MCP_STORAGE_DIR"])
    saved_skills = storage.list_skills()
    
    return json.dumps({
        "success": True,
        "saved_skills": saved_skills,
        "total_saved": len(saved_skills)
    }, indent=2)


def call_skill_stats(args: Dict) -> str:
    """获取统计"""
    os.environ["MCP_STORAGE_DIR"] = os.environ.get(
        "MCP_STORAGE_DIR",
        "/Users/blitz/.openclaw/workspace/self-evolving-skill/storage"
    )
    
    from core.storage import SkillStorage
    from core.skill_engine import SelfEvolvingSkillEngine, ValueGate
    from core.reflection_trigger import ReflectionTrigger
    
    storage = SkillStorage(os.environ["MCP_STORAGE_DIR"])
    engine = SelfEvolvingSkillEngine()
    engine.value_gate = ValueGate()
    trigger = ReflectionTrigger()
    
    storage_stats = storage.get_storage_stats()
    
    return json.dumps({
        "success": True,
        "stats": {
            **storage_stats,
            "engine": {
                "total_executions": engine.total_executions,
                "total_reflections": engine.total_reflections,
                "total_mutations": engine.total_mutations,
                "value_gate_acceptance": engine.value_gate.acceptance_rate
            },
            "reflection": {
                "trigger_rate": trigger.trigger_rate
            }
        }
    }, indent=2)


def call_skill_analyze(args: Dict) -> str:
    """分析嵌入"""
    import numpy as np
    
    from core.residual_pyramid import ResidualPyramid
    from core.reflection_trigger import ReflectionTrigger
    
    trigger = ReflectionTrigger()
    
    embedding = args.get("embedding", [])
    if not embedding:
        return json.dumps({"error": "需要提供embedding"}, indent=2)
    
    arr = np.array(embedding)
    pyramid = ResidualPyramid(max_layers=5, use_pca=False)
    decomposition = pyramid.decompose(arr)
    
    return json.dumps({
        "success": True,
        "analysis": {
            "total_energy": float(decomposition.total_energy),
            "residual_ratio": float(decomposition.residual_ratio),
            "layers_count": len(decomposition.layers),
            "suggested_abstraction": decomposition.suggested_abstraction.value,
            "novelty_score": float(decomposition.novelty_score)
        }
    }, indent=2)


def call_skill_save(args: Dict) -> str:
    """保存Skill"""
    os.environ["MCP_STORAGE_DIR"] = os.environ.get(
        "MCP_STORAGE_DIR",
        "/Users/blitz/.openclaw/workspace/self-evolving-skill/storage"
    )
    
    from core.storage import SkillStorage
    from core.skill_engine import SelfEvolvingSkillEngine
    
    storage = SkillStorage(os.environ["MCP_STORAGE_DIR"])
    engine = SelfEvolvingSkillEngine()
    
    skill_id = args.get("skill_id")
    
    # 加载skill来保存
    data = storage.load_full_skill(skill_id)
    
    if data:
        engine.skill_library[skill_id] = data["skill_obj"]
        
        paths = storage.save_full_skill(
            skill_id=skill_id,
            skill_obj=data["skill_obj"],
            embeddings=data["embeddings"]
        )
        
        return json.dumps({
            "success": True,
            "skill_id": skill_id,
            "message": "Skill已保存"
        }, indent=2)
    
    return json.dumps({
        "success": False,
        "error": f"Skill不存在: {skill_id}"
    }, indent=2)


def call_skill_load(args: Dict) -> str:
    """加载Skill"""
    os.environ["MCP_STORAGE_DIR"] = os.environ.get(
        "MCP_STORAGE_DIR",
        "/Users/blitz/.openclaw/workspace/self-evolving-skill/storage"
    )
    
    from core.storage import SkillStorage
    from core.skill_engine import SelfEvolvingSkillEngine
    
    storage = SkillStorage(os.environ["MCP_STORAGE_DIR"])
    engine = SelfEvolvingSkillEngine()
    
    skill_id = args.get("skill_id")
    data = storage.load_full_skill(skill_id)
    
    if data:
        engine.skill_library[skill_id] = data["skill_obj"]
        
        return json.dumps({
            "success": True,
            "skill_id": skill_id,
            "experience_count": len(data.get("embeddings", [])),
            "message": "Skill已加载"
        }, indent=2)
    
    return json.dumps({
        "success": False,
        "error": f"Skill不存在: {skill_id}"
    }, indent=2)


# ============ Main ============

def main():
    """主入口"""
    if len(sys.argv) < 3:
        print("用法: python3 mcporter_adapter.py <tool> <args_json>")
        sys.exit(1)
    
    tool = sys.argv[1]
    args_json = sys.argv[2]
    
    try:
        args = json.loads(args_json) if args_json else {}
    except json.JSONDecodeError:
        args = {}
    
    # 调用对应的工具
    handlers = {
        "skill_create": call_skill_create,
        "skill_list": call_skill_list,
        "skill_stats": call_skill_stats,
        "skill_analyze": call_skill_analyze,
        "skill_save": call_skill_save,
        "skill_load": call_skill_load
    }
    
    handler = handlers.get(tool)
    if not handler:
        print(json.dumps({
            "error": f"未知工具: {tool}"
        }, indent=2))
        sys.exit(1)
    
    result = handler(args)
    print(result)


if __name__ == "__main__":
    main()
