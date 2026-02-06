// OpenClaw MCP Tools Schema
// 此文件定义暴露给OpenClaw的MCP工具

const TOOLS = {
  skill_create: {
    name: 'skill_create',
    description: '创建一个新的自演化Skill',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Skill名称'
        },
        description: {
          type: 'string',
          description: 'Skill描述（可选）',
          default: ''
        },
        min_energy_ratio: {
          type: 'number',
          description: '最小残差能量比率',
          default: 0.10
        },
        target_trigger_rate: {
          type: 'number',
          description: '目标触发率',
          default: 0.15
        }
      },
      required: ['name']
    }
  },

  skill_execute: {
    name: 'skill_execute',
    description: '执行Skill并触发学习',
    parameters: {
      type: 'object',
      properties: {
        skill_id: {
          type: 'string',
          description: 'Skill ID'
        },
        context: {
          type: 'object',
          description: '执行上下文',
          default: {}
        },
        embedding: {
          type: 'array',
          items: { type: 'number' },
          description: '执行嵌入向量（可选，自动生成）'
        },
        success: {
          type: 'boolean',
          description: '执行是否成功',
          default: true
        },
        value: {
          type: 'number',
          description: '价值实现度',
          default: 1.0
        }
      },
      required: ['skill_id']
    }
  },

  skill_analyze: {
    name: 'skill_analyze',
    description: '分析嵌入向量（不触发学习）',
    parameters: {
      type: 'object',
      properties: {
        embedding: {
          type: 'array',
          items: { type: 'number' },
          description: '嵌入向量'
        }
      },
      required: ['embedding']
    }
  },

  skill_list: {
    name: 'skill_list',
    description: '列出所有Skill',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  skill_stats: {
    name: 'skill_stats',
    description: '获取系统统计',
    parameters: {
      type: 'object',
      properties: {}
    }
  },

  skill_save: {
    name: 'skill_save',
    description: '持久化保存Skill',
    parameters: {
      type: 'object',
      properties: {
        skill_id: {
          type: 'string',
          description: 'Skill ID'
        }
      },
      required: ['skill_id']
    }
  },

  skill_load: {
    name: 'skill_load',
    description: '加载已保存的Skill',
    parameters: {
      type: 'object',
      properties: {
        skill_id: {
          type: 'string',
          description: 'Skill ID'
        }
      },
      required: ['skill_id']
    }
  }
};

export { TOOLS };
export default TOOLS;
