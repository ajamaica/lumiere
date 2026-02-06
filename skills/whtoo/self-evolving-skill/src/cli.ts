#!/usr/bin/env node
/**
 * Self-Evolving Skill CLI
 */

import { argv } from 'process';

import { SelfEvolvingSkillEngine } from './index';

const USAGE = `
Self-Evolving Skill CLI

用法:
  npx self-evolving-skill create <name> [options]  创建新Skill
  npx self-evolving-skill execute <id> [options]  执行Skill
  npx self-evolving-skill analyze <embedding>      分析嵌入
  npx self-evolving-skill list                    列出所有Skill
  npx self-evolving-skill stats                   系统统计
  npx self-evolving-skill save <id>               保存Skill
  npx self-evolving-skill load <id>               加载Skill

选项:
  --storage <dir>     存储目录
  --context <json>    执行上下文
  --success           是否成功
  --value <number>    价值实现度

示例:
  npx self-evolving-skill create "ProblemSolver"
  npx self-evolving-skill execute skill_123 --success
  npx self-evolving-skill analyze "[0.1,0.2,0.3]"
`;

async function main() {
  const args = argv.slice(2);
  const command = args[0];
  
  const storageDir = process.env.STORAGE_DIR || './storage';
  
  const engine = new SelfEvolvingSkillEngine({ storageDir });
  
  try {
    switch (command) {
      case 'create': {
        const name = args[1];
        if (!name) {
          console.error('错误: 需要指定Skill名称');
          process.exit(1);
        }
        
        const result = await engine.createSkill({ name });
        console.log(`创建成功: ${result.skillId}`);
        console.log(`  名称: ${result.name}`);
        break;
      }
      
      case 'execute': {
        const skillId = args[1];
        if (!skillId) {
          console.error('错误: 需要指定Skill ID');
          process.exit(1);
        }
        
        // 解析选项
        const success = args.includes('--success');
        const contextArg = args.find(a => a.startsWith('--context='));
        const context = contextArg 
          ? JSON.parse(contextArg.split('=')[1]) 
          : {};
        const valueArg = args.find(a => a.startsWith('--value='));
        const value = valueArg ? parseFloat(valueArg.split('=')[1]) : 1.0;
        
        const result = await engine.execute({
          skillId,
          context,
          success,
          value
        });
        
        console.log(`执行结果:`);
        console.log(`  成功: ${result.success}`);
        console.log(`  反思触发: ${result.reflectionTriggered}`);
        console.log(`  变异接受: ${result.mutationAccepted}`);
        console.log(`  执行次数: ${result.skillStats.executionCount}`);
        console.log(`  成功率: ${(result.skillStats.successRate * 100).toFixed(1)}%`);
        break;
      }
      
      case 'analyze': {
        const embeddingArg = args[1];
        if (!embeddingArg) {
          console.error('错误: 需要指定嵌入向量');
          process.exit(1);
        }
        
        const embedding = JSON.parse(embeddingArg);
        const result = await engine.analyze(embedding);
        
        console.log(`分析结果:`);
        console.log(`  总能量: ${result.totalEnergy.toFixed(2)}`);
        console.log(`  残差比率: ${(result.residualRatio * 100).toFixed(1)}%`);
        console.log(`  层数: ${result.layersCount}`);
        console.log(`  建议操作: ${result.suggestedAbstraction}`);
        console.log(`  新颖性: ${result.noveltyScore.toFixed(3)}`);
        break;
      }
      
      case 'list': {
        const result = await engine.list();
        console.log(`Skills (${result.total}):`);
        for (const skill of result.skills) {
          console.log(`  ${skill.id} - ${skill.name}`);
        }
        break;
      }
      
      case 'stats': {
        const result = await engine.stats();
        console.log(`系统统计:`);
        console.log(`  Skills: ${result.skillsCount}`);
        console.log(`  Experiences: ${result.experiencesCount}`);
        console.log(`  存储大小: ${result.storageSizeMB} MB`);
        console.log(`  总执行: ${result.engine.totalExecutions}`);
        console.log(`  反思触发: ${result.engine.totalReflections}`);
        console.log(`  变异数: ${result.engine.totalMutations}`);
        console.log(`  价值门接受率: ${(result.engine.valueGateAcceptance * 100).toFixed(1)}%`);
        break;
      }
      
      case 'save': {
        const skillId = args[1];
        if (!skillId) {
          console.error('错误: 需要指定Skill ID');
          process.exit(1);
        }
        
        const success = await engine.save(skillId);
        console.log(success ? '保存成功' : '保存失败');
        break;
      }
      
      case 'load': {
        const skillId = args[1];
        if (!skillId) {
          console.error('错误: 需要指定Skill ID');
          process.exit(1);
        }
        
        const success = await engine.load(skillId);
        console.log(success ? '加载成功' : '加载失败');
        break;
      }
      
      case 'help':
      case '--help':
      case '-h':
        console.log(USAGE);
        break;
      
      default:
        console.error(`未知命令: ${command}`);
        console.log(USAGE);
        process.exit(1);
    }
  } finally {
    engine.shutdown();
  }
}

main().catch(console.error);
