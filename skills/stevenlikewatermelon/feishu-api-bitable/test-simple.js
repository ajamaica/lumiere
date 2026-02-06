#!/usr/bin/env node

/**
 * 简单测试脚本
 */

console.log('=== 飞书多维表格技能测试 ===\n');

// 检查环境变量
const requiredEnvVars = ['FEISHU_APP_ID', 'FEISHU_APP_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('❌ 缺少必要的环境变量:');
  missingVars.forEach(varName => {
    console.log(`  - ${varName}`);
  });
  console.log('\n请设置环境变量或创建 .env 文件');
  console.log('参考 .env.example 文件');
  process.exit(1);
}

console.log('✅ 环境变量检查通过');
console.log(`应用ID: ${process.env.FEISHU_APP_ID ? '已设置' : '未设置'}`);
console.log(`应用密钥: ${process.env.FEISHU_APP_SECRET ? '已设置' : '未设置'}`);

// 测试API客户端
try {
  const FeishuBitableAPI = require('./src/api');
  const api = new FeishuBitableAPI();
  
  console.log('\n✅ API客户端初始化成功');
  
  // 测试连接
  console.log('\n正在测试连接...');
  api.testConnection().then(result => {
    if (result.success) {
      console.log('✅ 连接测试成功');
      console.log(`令牌有效: ${result.tokenValid ? '是' : '否'}`);
    } else {
      console.log('❌ 连接测试失败:', result.message);
    }
    
    console.log('\n=== 测试完成 ===');
    console.log('\n可用命令:');
    console.log('  node bin/cli.js test              - 测试连接');
    console.log('  node bin/cli.js --help           - 查看所有命令');
    console.log('  node bin/cli.js list-tables --help - 查看具体命令帮助');
    
  }).catch(error => {
    console.error('❌ 连接测试失败:', error.message);
    console.log('\n可能的原因:');
    console.log('1. 应用ID或密钥错误');
    console.log('2. 网络连接问题');
    console.log('3. 应用权限不足');
  });
  
} catch (error) {
  console.error('❌ API客户端初始化失败:', error.message);
  process.exit(1);
}