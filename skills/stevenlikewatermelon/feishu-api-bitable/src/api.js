/**
 * 飞书多维表格API客户端
 */

const axios = require('axios');
const { getEnvVar, getAccessToken, validateRequired, parseJsonInput, delay } = require('./utils');

class FeishuBitableAPI {
  constructor(options = {}) {
    this.appId = options.appId || getEnvVar('FEISHU_APP_ID');
    this.appSecret = options.appSecret || getEnvVar('FEISHU_APP_SECRET') || getEnvVar('FEISHU_APP_SECRET_PATH');
    this.baseURL = options.baseURL || 'https://open.feishu.cn/open-apis/bitable/v1';
    this.accessToken = options.accessToken;
    this.autoRefreshToken = options.autoRefreshToken !== false;
    
    if (!this.appId || !this.appSecret) {
      throw new Error('缺少FEISHU_APP_ID或FEISHU_APP_SECRET环境变量');
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
    
    // 请求拦截器：添加认证头
    this.client.interceptors.request.use(async (config) => {
      if (!this.accessToken) {
        await this.refreshAccessToken();
      }
      
      config.headers.Authorization = `Bearer ${this.accessToken}`;
      return config;
    });
    
    // 响应拦截器：处理token过期
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // 如果是token过期错误且未重试过
        if (error.response && error.response.status === 99991663 && !originalRequest._retry && this.autoRefreshToken) {
          originalRequest._retry = true;
          
          try {
            await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * 刷新访问令牌
   */
  async refreshAccessToken() {
    try {
      this.accessToken = await getAccessToken(this.appId, this.appSecret);
      return this.accessToken;
    } catch (error) {
      throw new Error(`刷新访问令牌失败: ${error.message}`);
    }
  }
  
  /**
   * 获取应用信息
   */
  async getApp(appToken) {
    validateRequired({ appToken }, ['appToken']);
    
    try {
      const response = await this.client.get(`/apps/${appToken}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, '获取应用信息');
    }
  }
  
  /**
   * 获取数据表列表
   */
  async listTables(appToken, params = {}) {
    validateRequired({ appToken }, ['appToken']);
    
    try {
      const response = await this.client.get(`/apps/${appToken}/tables`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, '获取数据表列表');
    }
  }
  
  /**
   * 创建数据表
   */
  async createTable(appToken, tableData) {
    validateRequired({ appToken }, ['appToken']);
    
    try {
      const response = await this.client.post(`/apps/${appToken}/tables`, tableData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, '创建数据表');
    }
  }
  
  /**
   * 获取数据表详情
   */
  async getTable(appToken, tableId) {
    validateRequired({ appToken, tableId }, ['appToken', 'tableId']);
    
    try {
      const response = await this.client.get(`/apps/${appToken}/tables/${tableId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, '获取数据表详情');
    }
  }
  
  /**
   * 删除数据表
   */
  async deleteTable(appToken, tableId) {
    validateRequired({ appToken, tableId }, ['appToken', 'tableId']);
    
    try {
      const response = await this.client.delete(`/apps/${appToken}/tables/${tableId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, '删除数据表');
    }
  }
  
  /**
   * 获取字段列表
   */
  async listFields(appToken, tableId, params = {}) {
    validateRequired({ appToken, tableId }, ['appToken', 'tableId']);
    
    try {
      const response = await this.client.get(`/apps/${appToken}/tables/${tableId}/fields`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, '获取字段列表');
    }
  }
  
  /**
   * 创建字段
   */
  async createField(appToken, tableId, fieldData) {
    validateRequired({ appToken, tableId }, ['appToken', 'tableId']);
    
    try {
      const response = await this.client.post(`/apps/${appToken}/tables/${tableId}/fields`, fieldData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, '创建字段');
    }
  }
  
  /**
   * 更新字段
   */
  async updateField(appToken, tableId, fieldId, fieldData) {
    validateRequired({ appToken, tableId, fieldId }, ['appToken', 'tableId', 'fieldId']);
    
    try {
      const response = await this.client.put(`/apps/${appToken}/tables/${tableId}/fields/${fieldId}`, fieldData);
      return response.data;
    } catch (error) {
      throw this.handleError(error, '更新字段');
    }
  }
  
  /**
   * 获取记录列表
   */
  async listRecords(appToken, tableId, params = {}) {
    validateRequired({ appToken, tableId }, ['appToken', 'tableId']);
    
    try {
      const response = await this.client.get(`/apps/${appToken}/tables/${tableId}/records`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, '获取记录列表');
    }
  }
  
  /**
   * 创建记录
   */
  async createRecord(appToken, tableId, recordData) {
    validateRequired({ appToken, tableId }, ['appToken', 'tableId']);
    
    try {
      const response = await this.client.post(`/apps/${appToken}/tables/${tableId}/records`, {
        fields: recordData
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, '创建记录');
    }
  }
  
  /**
   * 批量创建记录
   */
  async batchCreateRecords(appToken, tableId, records) {
    validateRequired({ appToken, tableId }, ['appToken', 'tableId']);
    
    try {
      const response = await this.client.post(`/apps/${appToken}/tables/${tableId}/records/batch_create`, {
        records: records.map(record => ({ fields: record }))
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, '批量创建记录');
    }
  }
  
  /**
   * 获取记录详情
   */
  async getRecord(appToken, tableId, recordId) {
    validateRequired({ appToken, tableId, recordId }, ['appToken', 'tableId', 'recordId']);
    
    try {
      const response = await this.client.get(`/apps/${appToken}/tables/${tableId}/records/${recordId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, '获取记录详情');
    }
  }
  
  /**
   * 更新记录
   */
  async updateRecord(appToken, tableId, recordId, recordData) {
    validateRequired({ appToken, tableId, recordId }, ['appToken', 'tableId', 'recordId']);
    
    try {
      const response = await this.client.put(`/apps/${appToken}/tables/${tableId}/records/${recordId}`, {
        fields: recordData
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, '更新记录');
    }
  }
  
  /**
   * 批量更新记录
   */
  async batchUpdateRecords(appToken, tableId, records) {
    validateRequired({ appToken, tableId }, ['appToken', 'tableId']);
    
    try {
      const response = await this.client.post(`/apps/${appToken}/tables/${tableId}/records/batch_update`, {
        records: records.map(record => ({
          record_id: record.record_id,
          fields: record.fields
        }))
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, '批量更新记录');
    }
  }
  
  /**
   * 删除记录
   */
  async deleteRecord(appToken, tableId, recordId) {
    validateRequired({ appToken, tableId, recordId }, ['appToken', 'tableId', 'recordId']);
    
    try {
      const response = await this.client.delete(`/apps/${appToken}/tables/${tableId}/records/${recordId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, '删除记录');
    }
  }
  
  /**
   * 批量删除记录
   */
  async batchDeleteRecords(appToken, tableId, recordIds) {
    validateRequired({ appToken, tableId }, ['appToken', 'tableId']);
    
    try {
      const response = await this.client.post(`/apps/${appToken}/tables/${tableId}/records/batch_delete`, {
        records: recordIds.map(recordId => ({ record_id: recordId }))
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, '批量删除记录');
    }
  }
  
  /**
   * 获取视图列表
   */
  async listViews(appToken, tableId, params = {}) {
    validateRequired({ appToken, tableId }, ['appToken', 'tableId']);
    
    try {
      const response = await this.client.get(`/apps/${appToken}/tables/${tableId}/views`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, '获取视图列表');
    }
  }
  
  /**
   * 获取视图详情
   */
  async getView(appToken, tableId, viewId) {
    validateRequired({ appToken, tableId, viewId }, ['appToken', 'tableId', 'viewId']);
    
    try {
      const response = await this.client.get(`/apps/${appToken}/tables/${tableId}/views/${viewId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, '获取视图详情');
    }
  }
  
  /**
   * 错误处理
   */
  handleError(error, operation) {
    if (error.response) {
      const { status, data } = error.response;
      const errorMsg = data.msg || data.message || error.message;
      
      const fullError = new Error(`${operation}失败: ${errorMsg} (状态码: ${status})`);
      fullError.status = status;
      fullError.data = data;
      
      return fullError;
    } else if (error.request) {
      return new Error(`${operation}失败: 网络错误，无法连接到飞书服务器`);
    } else {
      return new Error(`${operation}失败: ${error.message}`);
    }
  }
  
  /**
   * 测试连接
   */
  async testConnection() {
    try {
      await this.refreshAccessToken();
      return {
        success: true,
        message: '连接测试成功',
        appId: this.appId,
        tokenValid: !!this.accessToken
      };
    } catch (error) {
      return {
        success: false,
        message: `连接测试失败: ${error.message}`,
        appId: this.appId
      };
    }
  }
}

module.exports = FeishuBitableAPI;