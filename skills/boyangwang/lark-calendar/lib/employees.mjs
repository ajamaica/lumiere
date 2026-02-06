/**
 * Employee Directory - Dynamic lookup via Lark Contact API
 * 
 * Uses Lark's contact API to resolve names to user_ids dynamically.
 * Falls back to cached data for known employees.
 */

import { larkApi } from './lark-api.mjs';

// Boyang's user_id - always added as attendee
export const BOYANG_USER_ID = 'dgg163e1';

// Cache for employee data (populated on first lookup)
let employeeCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3600000; // 1 hour

// Fallback static data for known employees (used when API fails)
// Update this when team changes, or add contact:contact:readonly permission for dynamic lookup
const FALLBACK_EMPLOYEES = {
  'dgg163e1': { user_id: 'dgg163e1', name: 'Boyang', en_name: 'Boyang', nickname: 'by' },
  'gb71g28b': { user_id: 'gb71g28b', name: 'RK', en_name: 'RK' },
  '53gc5724': { user_id: '53gc5724', name: 'Ding', en_name: 'Ding' },
  '217ec2c2': { user_id: '217ec2c2', name: 'Charline', en_name: 'Charline' },
  'f2bfd283': { user_id: 'f2bfd283', name: '曾晓玲', en_name: 'xiaoling' },
  'f26fe45d': { user_id: 'f26fe45d', name: 'HH', en_name: 'HH' },
  '45858f91': { user_id: '45858f91', name: 'Eva', nickname: 'zan' },
  '7f79b6de': { user_id: '7f79b6de', name: 'Issac', en_name: 'Issac' },
  '1fb2547g': { user_id: '1fb2547g', name: '王铁柱' },
  'e5997acd': { user_id: 'e5997acd', name: 'Nico', nickname: '尼克' },
  '438c3c1f': { user_id: '438c3c1f', name: 'Ivan', en_name: 'Ivan' },
  '17g8bab2': { user_id: '17g8bab2', name: 'Dodo', en_name: 'Dodo' },
  '73b45ec5': { user_id: '73b45ec5', name: '启超', en_name: 'QiChaoShi' },
  'd1978a39': { user_id: 'd1978a39', name: 'chenglin', en_name: 'chenglin' },
  'ef6fc4a7': { user_id: 'ef6fc4a7', name: '冠林', en_name: 'Green' },
  'b47fa8f2': { user_id: 'b47fa8f2', name: 'Sixian-Yu', nickname: 'sx', en_name: 'sixian' },
  '934fbf15': { user_id: '934fbf15', name: '俊晨', en_name: 'jc', nickname: 'sagiri' },
  '8c4aad87': { user_id: '8c4aad87', name: '大明', en_name: 'daming' },
  'ab87g5e1': { user_id: 'ab87g5e1', name: 'Emily Yobal', en_name: 'Emily' },
  '55fa337f': { user_id: '55fa337f', name: '景达', en_name: 'jingda' },
  '333c7cf1': { user_id: '333c7cf1', name: '刘纪源', en_name: 'Aiden', nickname: '纪源' },
};

/**
 * Fetch all employees from Lark Contact API
 * @returns {Promise<Map<string, object>>} - Map of user_id -> employee data
 */
async function fetchEmployees() {
  const employees = new Map();
  let pageToken = '';
  
  try {
    do {
      const params = {
        department_id: '0', // Root department = all employees
        page_size: 50,
        user_id_type: 'user_id'
      };
      if (pageToken) params.page_token = pageToken;
      
      const result = await larkApi('GET', '/contact/v3/users', { params });
      
      for (const user of (result.items || [])) {
        employees.set(user.user_id, {
          user_id: user.user_id,
          name: user.name,
          en_name: user.en_name,
          nickname: user.nickname,
          email: user.email,
          mobile: user.mobile,
          department_ids: user.department_ids,
          open_id: user.open_id
        });
      }
      
      pageToken = result.has_more ? result.page_token : '';
    } while (pageToken);
    
    return employees;
  } catch (error) {
    console.error('Failed to fetch employees from Lark API:', error.message);
    console.log('[employees] Using fallback static employee data');
    // Return fallback data
    const fallback = new Map();
    for (const [id, emp] of Object.entries(FALLBACK_EMPLOYEES)) {
      fallback.set(id, emp);
    }
    return fallback;
  }
}

/**
 * Get employee cache (refreshes if stale)
 */
async function getEmployeeCache() {
  const now = Date.now();
  if (!employeeCache || (now - cacheTimestamp) > CACHE_TTL) {
    employeeCache = await fetchEmployees();
    cacheTimestamp = now;
    
    if (employeeCache.size > 0) {
      console.log(`[employees] Loaded ${employeeCache.size} employees from Lark API`);
    }
  }
  return employeeCache;
}

/**
 * Build name lookup index from employee cache
 */
function buildNameIndex(employees) {
  const index = new Map();
  
  for (const [userId, emp] of employees) {
    // Index by various name fields (case-insensitive)
    const names = [emp.name, emp.en_name, emp.nickname].filter(Boolean);
    for (const name of names) {
      index.set(name.toLowerCase(), userId);
      // Also index parts (e.g., "Wang Boyang" -> "boyang", "wang")
      for (const part of name.split(/\s+/)) {
        if (part.length > 1) {
          index.set(part.toLowerCase(), userId);
        }
      }
    }
  }
  
  return index;
}

/**
 * Resolve a name to user_id
 * @param {string} name - Employee name (case-insensitive)
 * @returns {Promise<string|null>} - user_id or null if not found
 */
export async function resolveNameToId(name) {
  if (!name) return null;
  
  const employees = await getEmployeeCache();
  
  // Check if it's already a user_id
  if (employees.has(name)) return name;
  
  // Build index and lookup
  const index = buildNameIndex(employees);
  return index.get(name.toLowerCase()) || null;
}

/**
 * Resolve multiple names to user_ids
 * @param {string[]} names - Array of names
 * @returns {Promise<{resolved: string[], unresolved: string[]}>}
 */
export async function resolveNames(names) {
  const resolved = [];
  const unresolved = [];
  
  for (const name of names) {
    const userId = await resolveNameToId(name.trim());
    if (userId) {
      if (!resolved.includes(userId)) {
        resolved.push(userId);
      }
    } else {
      unresolved.push(name);
    }
  }
  
  return { resolved, unresolved };
}

/**
 * Get employee info by user_id
 * @param {string} userId 
 * @returns {Promise<object|null>}
 */
export async function getEmployee(userId) {
  const employees = await getEmployeeCache();
  return employees.get(userId) || null;
}

/**
 * Get display name for a user_id
 * @param {string} userId 
 * @returns {Promise<string>}
 */
export async function getDisplayName(userId) {
  const emp = await getEmployee(userId);
  return emp ? (emp.name || emp.en_name || userId) : userId;
}

/**
 * Synchronous display name (uses cached data only)
 * For use in non-async contexts - may return user_id if cache not populated
 */
export function getDisplayNameSync(userId) {
  if (!employeeCache) return userId;
  const emp = employeeCache.get(userId);
  return emp ? (emp.name || emp.en_name || userId) : userId;
}

/**
 * Ensure Boyang is in the attendee list
 * @param {string[]} userIds 
 * @returns {string[]}
 */
export function ensureBoyangIncluded(userIds) {
  if (!userIds.includes(BOYANG_USER_ID)) {
    return [...userIds, BOYANG_USER_ID];
  }
  return userIds;
}

/**
 * List all employees (for debugging/display)
 * @returns {Promise<object[]>}
 */
export async function listEmployees() {
  const employees = await getEmployeeCache();
  return Array.from(employees.values());
}

/**
 * Search employees by partial name match
 * @param {string} query 
 * @returns {Promise<object[]>}
 */
export async function searchEmployees(query) {
  const employees = await getEmployeeCache();
  const results = [];
  const q = query.toLowerCase();
  
  for (const emp of employees.values()) {
    const searchFields = [emp.name, emp.en_name, emp.nickname, emp.email].filter(Boolean);
    if (searchFields.some(f => f.toLowerCase().includes(q))) {
      results.push(emp);
    }
  }
  
  return results;
}
