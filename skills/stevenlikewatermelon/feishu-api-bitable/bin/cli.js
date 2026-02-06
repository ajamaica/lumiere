#!/usr/bin/env node

/**
 * 飞书多维表格命令行工具
 */

const { program } = require('commander');
const FeishuBitableAPI = require('../src/api');
const { parseJsonInput, validateRequired } = require('../src/utils');

// 加载环境变量
require('dotenv').config();

program
  .name('feishu-bitable')
  .description('飞书多维表格命令行工具')
  .version('1.0.0');

// 测试连接命令
program
  .command('test')
  .description('测试飞书连接')
  .action(async () => {
    try {
      const api = new FeishuBitableAPI();
      const result = await api.testConnection();
      
      if (result.success) {
        console.log('✅ 连接测试成功');
        console.log(`应用ID: ${result.appId}`);
        console.log(`令牌有效: ${result.tokenValid ? '是' : '否'}`);
      } else {
        console.error('❌ 连接测试失败:', result.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ 连接测试失败:', error.message);
      process.exit(1);
    }
  });

// 获取应用信息
program
  .command('get-app')
  .description('获取应用信息')
  .requiredOption('--app-token <token>', '应用token')
  .action(async (options) => {
    try {
      validateRequired(options, ['appToken']);
      const api = new FeishuBitableAPI();
      const result = await api.getApp(options.appToken);
      
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ 获取应用信息失败:', error.message);
      process.exit(1);
    }
  });

// 列出数据表
program
  .command('list-tables')
  .description('列出所有数据表')
  .requiredOption('--app-token <token>', '应用token')
  .option('--page-size <number>', '每页大小', '100')
  .option('--page-token <token>', '分页token')
  .action(async (options) => {
    try {
      validateRequired(options, ['appToken']);
      const api = new FeishuBitableAPI();
      
      const params = {};
      if (options.pageSize) params.page_size = parseInt(options.pageSize);
      if (options.pageToken) params.page_token = options.pageToken;
      
      const result = await api.listTables(options.appToken, params);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ 列出数据表失败:', error.message);
      process.exit(1);
    }
  });

// 创建数据表
program
  .command('create-table')
  .description('创建数据表')
  .requiredOption('--app-token <token>', '应用token')
  .requiredOption('--name <name>', '表名')
  .option('--fields <json>', '字段定义JSON或@文件路径')
  .action(async (options) => {
    try {
      validateRequired(options, ['appToken', 'name']);
      const api = new FeishuBitableAPI();
      
      const tableData = {
        name: options.name
      };
      
      if (options.fields) {
        tableData.fields = parseJsonInput(options.fields);
      }
      
      const result = await api.createTable(options.appToken, tableData);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ 创建数据表失败:', error.message);
      process.exit(1);
    }
  });

// 列出记录
program
  .command('list-records')
  .description('列出记录')
  .requiredOption('--app-token <token>', '应用token')
  .requiredOption('--table-id <id>', '表ID')
  .option('--page-size <number>', '每页大小', '100')
  .option('--page-token <token>', '分页token')
  .option('--filter <json>', '过滤条件JSON')
  .option('--sort <json>', '排序条件JSON')
  .action(async (options) => {
    try {
      validateRequired(options, ['appToken', 'tableId']);
      const api = new FeishuBitableAPI();
      
      const params = {};
      if (options.pageSize) params.page_size = parseInt(options.pageSize);
      if (options.pageToken) params.page_token = options.pageToken;
      if (options.filter) params.filter = parseJsonInput(options.filter);
      if (options.sort) params.sort = parseJsonInput(options.sort);
      
      const result = await api.listRecords(options.appToken, options.tableId, params);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ 列出记录失败:', error.message);
      process.exit(1);
    }
  });

// 创建记录
program
  .command('create-record')
  .description('创建记录')
  .requiredOption('--app-token <token>', '应用token')
  .requiredOption('--table-id <id>', '表ID')
  .requiredOption('--data <json>', '记录数据JSON或@文件路径')
  .action(async (options) => {
    try {
      validateRequired(options, ['appToken', 'tableId', 'data']);
      const api = new FeishuBitableAPI();
      
      const recordData = parseJsonInput(options.data);
      const result = await api.createRecord(options.appToken, options.tableId, recordData);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ 创建记录失败:', error.message);
      process.exit(1);
    }
  });

// 批量创建记录
program
  .command('batch-create')
  .description('批量创建记录')
  .requiredOption('--app-token <token>', '应用token')
  .requiredOption('--table-id <id>', '表ID')
  .requiredOption('--data <json>', '记录数据数组JSON或@文件路径')
  .action(async (options) => {
    try {
      validateRequired(options, ['appToken', 'tableId', 'data']);
      const api = new FeishuBitableAPI();
      
      const records = parseJsonInput(options.data);
      if (!Array.isArray(records)) {
        throw new Error('数据必须是数组格式');
      }
      
      const result = await api.batchCreateRecords(options.appToken, options.tableId, records);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ 批量创建记录失败:', error.message);
      process.exit(1);
    }
  });

// 更新记录
program
  .command('update-record')
  .description('更新记录')
  .requiredOption('--app-token <token>', '应用token')
  .requiredOption('--table-id <id>', '表ID')
  .requiredOption('--record-id <id>', '记录ID')
  .requiredOption('--data <json>', '更新数据JSON或@文件路径')
  .action(async (options) => {
    try {
      validateRequired(options, ['appToken', 'tableId', 'recordId', 'data']);
      const api = new FeishuBitableAPI();
      
      const recordData = parseJsonInput(options.data);
      const result = await api.updateRecord(options.appToken, options.tableId, options.recordId, recordData);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ 更新记录失败:', error.message);
      process.exit(1);
    }
  });

// 删除记录
program
  .command('delete-record')
  .description('删除记录')
  .requiredOption('--app-token <token>', '应用token')
  .requiredOption('--table-id <id>', '表ID')
  .requiredOption('--record-id <id>', '记录ID')
  .action(async (options) => {
    try {
      validateRequired(options, ['appToken', 'tableId', 'recordId']);
      const api = new FeishuBitableAPI();
      
      const result = await api.deleteRecord(options.appToken, options.tableId, options.recordId);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ 删除记录失败:', error.message);
      process.exit(1);
    }
  });

// 列出字段
program
  .command('list-fields')
  .description('列出字段')
  .requiredOption('--app-token <token>', '应用token')
  .requiredOption('--table-id <id>', '表ID')
  .option('--page-size <number>', '每页大小', '100')
  .option('--page-token <token>', '分页token')
  .action(async (options) => {
    try {
      validateRequired(options, ['appToken', 'tableId']);
      const api = new FeishuBitableAPI();
      
      const params = {};
      if (options.pageSize) params.page_size = parseInt(options.pageSize);
      if (options.pageToken) params.page_token = options.pageToken;
      
      const result = await api.listFields(options.appToken, options.tableId, params);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ 列出字段失败:', error.message);
      process.exit(1);
    }
  });

// 列出视图
program
  .command('list-views')
  .description('列出视图')
  .requiredOption('--app-token <token>', '应用token')
  .requiredOption('--table-id <id>', '表ID')
  .option('--page-size <number>', '每页大小', '100')
  .option('--page-token <token>', '分页token')
  .action(async (options) => {
    try {
      validateRequired(options, ['appToken', 'tableId']);
      const api = new FeishuBitableAPI();
      
      const params = {};
      if (options.pageSize) params.page_size = parseInt(options.pageSize);
      if (options.pageToken) params.page_token = options.pageToken;
      
      const result = await api.listViews(options.appToken, options.tableId, params);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('❌ 列出视图失败:', error.message);
      process.exit(1);
    }
  });

// 如果没有命令，显示帮助
if (!process.argv.slice(2).length) {
  program.outputHelp();
} else {
  program.parse(process.argv);
}