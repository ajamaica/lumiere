/**
 * Polyfill for browser globals (File, FormData, Blob) required by undici/node-fetch v3
 * This file must be loaded via node --require BEFORE any module resolution happens.
 * 
 * Usage: NODE_OPTIONS="--require ./skills/alephnet-node/lib/__tests__/file-polyfill.cjs" npx vitest
 */

if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(parts, name, options = {}) {
      this.parts = parts;
      this.name = name;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
    }
    
    get size() {
      return this.parts.reduce((acc, part) => {
        if (typeof part === 'string') return acc + part.length;
        if (part instanceof Blob) return acc + part.size;
        return acc;
      }, 0);
    }
    
    async text() {
      return this.parts.join('');
    }
    
    async arrayBuffer() {
      const text = await this.text();
      const encoder = new TextEncoder();
      return encoder.encode(text).buffer;
    }
  };
}

if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.parts = parts;
      this.type = options.type || '';
    }
    
    get size() {
      return this.parts.reduce((acc, part) => {
        if (typeof part === 'string') return acc + part.length;
        return acc;
      }, 0);
    }
    
    async text() {
      return this.parts.join('');
    }
    
    async arrayBuffer() {
      const text = await this.text();
      const encoder = new TextEncoder();
      return encoder.encode(text).buffer;
    }
    
    slice(start, end, contentType) {
      const sliced = this.parts.slice(start, end);
      return new Blob(sliced, { type: contentType || this.type });
    }
  };
}

if (typeof globalThis.FormData === 'undefined') {
  globalThis.FormData = class FormData {
    constructor() {
      this._data = new Map();
    }
    
    append(key, value, filename) {
      const existing = this._data.get(key) || [];
      existing.push({ value, filename });
      this._data.set(key, existing);
    }
    
    set(key, value, filename) {
      this._data.set(key, [{ value, filename }]);
    }
    
    get(key) {
      const entries = this._data.get(key);
      return entries ? entries[0]?.value : null;
    }
    
    getAll(key) {
      const entries = this._data.get(key) || [];
      return entries.map(e => e.value);
    }
    
    has(key) {
      return this._data.has(key);
    }
    
    delete(key) {
      this._data.delete(key);
    }
    
    *entries() {
      for (const [key, values] of this._data) {
        for (const { value } of values) {
          yield [key, value];
        }
      }
    }
    
    *keys() {
      for (const key of this._data.keys()) {
        yield key;
      }
    }
    
    *values() {
      for (const values of this._data.values()) {
        for (const { value } of values) {
          yield value;
        }
      }
    }
    
    [Symbol.iterator]() {
      return this.entries();
    }
  };
}
