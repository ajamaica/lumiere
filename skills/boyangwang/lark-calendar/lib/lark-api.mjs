/**
 * Lark (Feishu) API Wrapper
 * Handles authentication and API calls with automatic token refresh
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load secrets
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../../../.secrets.env') });

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

// Use larksuite.com for international Lark
const BASE_URL = 'https://open.larksuite.com/open-apis';

let accessToken = null;
let tokenExpiry = 0;

/**
 * Get or refresh access token
 */
async function getAccessToken() {
  // Return cached token if still valid (with 5 min buffer)
  if (accessToken && Date.now() < tokenExpiry - 300000) {
    return accessToken;
  }
  
  const response = await fetch(`${BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET
    })
  });
  
  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }
  
  accessToken = `Bearer ${data.tenant_access_token}`;
  // Token expires in ~2 hours, we store expiry time
  tokenExpiry = Date.now() + (data.expire * 1000);
  
  return accessToken;
}

/**
 * Make authenticated API request
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - { params, data }
 * @returns {object} - Response data
 */
export async function larkApi(method, endpoint, { params = null, data = null } = {}) {
  const token = await getAccessToken();
  
  let url = `${BASE_URL}${endpoint}`;
  
  // Add query params
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  const fetchOptions = {
    method,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  };
  
  if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    fetchOptions.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, fetchOptions);
  const result = await response.json();
  
  // Check for token expiry error
  if (result.code === 99991663) {
    // Token expired, clear cache and retry once
    accessToken = null;
    tokenExpiry = 0;
    return larkApi(method, endpoint, { params, data });
  }
  
  if (result.code !== 0) {
    const error = new Error(`Lark API error: ${JSON.stringify(result)}`);
    error.code = result.code;
    error.larkResponse = result;
    throw error;
  }
  
  return result.data;
}

/**
 * Reply to a message
 * @param {string} messageId - Message ID to reply to
 * @param {object} content - Message content
 */
export async function replyMessage(messageId, content) {
  return larkApi('POST', `/im/v1/messages/${messageId}/reply`, { data: content });
}

/**
 * Send message to a chat
 * @param {string} receiveId - Chat ID or user ID
 * @param {string} receiveIdType - 'chat_id' | 'user_id' | 'open_id'
 * @param {object} content - Message content
 */
export async function sendMessage(receiveId, receiveIdType, content) {
  return larkApi('POST', '/im/v1/messages', {
    params: { receive_id_type: receiveIdType },
    data: {
      receive_id: receiveId,
      ...content
    }
  });
}
