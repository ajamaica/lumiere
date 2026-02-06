/**
 * 工具函数
 */

const fs = require('fs');
const path = require('path');

/**
 * 读取环境变量
 */
function getEnvVar(name, defaultValue = null) {
  // 从环境变量读取
  let value = process.env[name];
  
  // 如果是文件路径，从文件读取
  if (name.endsWith('_PATH') && value) {
    try {
      const filePath = value.startsWith('~') 
        ? path.join(process.env.HOME, value.slice(1))
        : value;
      
      if (fs.existsSync(filePath)) {
        value = fs.readFileSync(filePath, 'utf8').trim();
      }
    } catch (error) {
      console.warn(`无法读取文件 ${value}: ${error.message}`);
    }
  }
  
  return value || defaultValue;
}

/**
 * 获取飞书访问令牌
 */
async function getAccessToken(appId, appSecret) {
  const axios = require('axios');
  
  try {
    const response = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/', {
      app_id: appId,
      app_secret: appSecret
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
    
    if (response.data.code === 0) {
      return response.data.tenant_access_token;
    } else {
      throw new Error(`获取访问令牌失败: ${response.data.msg}`);
    }
  } catch (error) {
    throw new Error(`获取访问令牌时出错: ${error.message}`);
  }
}

/**
 * 验证必填参数
 */
function validateRequired(params, requiredFields) {
  for (const field of requiredFields) {
    if (!params[field]) {
      throw new Error(`缺少必填参数: ${field}`);
    }
  }
}

/**
 * 解析JSON字符串或文件
 */
function parseJsonInput(input) {
  if (!input) return null;
  
  // 如果是文件路径（以@开头）
  if (typeof input === 'string' && input.startsWith('@')) {
    const filePath = input.slice(1);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`无法读取或解析文件 ${filePath}: ${error.message}`);
    }
  }
  
  // 如果是JSON字符串
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch (error) {
      // 如果不是有效的JSON，返回原始字符串
      return input;
    }
  }
  
  // 已经是对象
  return input;
}

/**
 * 格式化日期
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  const d = date instanceof Date ? date : new Date(date);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 分页处理
 */
async function paginate(fetchFunction, params = {}, pageSize = 100) {
  let allItems = [];
  let pageToken = null;
  let hasMore = true;
  let page = 1;
  
  while (hasMore) {
    try {
      const response = await fetchFunction({
        ...params,
        page_size: pageSize,
        page_token: pageToken
      });
      
      if (response.data && response.data.items) {
        allItems = allItems.concat(response.data.items);
        
        if (response.data.has_more && response.data.page_token) {
          pageToken = response.data.page_token;
          page++;
          
          // 避免速率限制
          await delay(100);
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`分页获取第 ${page} 页时出错:`, error.message);
      hasMore = false;
    }
  }
  
  return allItems;
}

/**
 * 构建字段值
 */
function buildFieldValue(fieldType, value) {
  switch (fieldType) {
    case 'text':
      return value;
    case 'number':
      return Number(value);
    case 'single_select':
      return { name: value };
    case 'multi_select':
      return Array.isArray(value) ? value.map(v => ({ name: v })) : [{ name: value }];
    case 'date':
      return { start: formatDate(value, 'YYYY-MM-DD') };
    case 'person':
      return Array.isArray(value) ? value.map(id => ({ id })) : [{ id: value }];
    case 'checkbox':
      return Boolean(value);
    case 'url':
      return value;
    case 'phone':
      return value;
    case 'email':
      return value;
    case 'attachment':
      // 附件需要先上传
      return value;
    default:
      return value;
  }
}

/**
 * 解析记录字段
 */
function parseRecordFields(record, fieldsMap) {
  const result = {};
  
  if (!record.fields) return result;
  
  for (const [fieldId, value] of Object.entries(record.fields)) {
    const fieldInfo = fieldsMap[fieldId];
    if (fieldInfo) {
      result[fieldInfo.field_name] = parseFieldValue(fieldInfo.type, value);
    } else {
      result[fieldId] = value;
    }
  }
  
  return result;
}

/**
 * 解析字段值
 */
function parseFieldValue(fieldType, value) {
  if (value === null || value === undefined) return null;
  
  switch (fieldType) {
    case 'text':
      return String(value);
    case 'number':
      return Number(value);
    case 'single_select':
      return value?.name || value;
    case 'multi_select':
      return Array.isArray(value) ? value.map(v => v.name || v) : [value];
    case 'date':
      return value?.start || value;
    case 'person':
      return Array.isArray(value) ? value.map(p => p.id || p) : [value];
    case 'checkbox':
      return Boolean(value);
    default:
      return value;
  }
}

module.exports = {
  getEnvVar,
  getAccessToken,
  validateRequired,
  parseJsonInput,
  formatDate,
  delay,
  paginate,
  buildFieldValue,
  parseRecordFields,
  parseFieldValue
};