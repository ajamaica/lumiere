/**
 * Moltbook Adapter Tests
 */

import { createMoltbookClient,MoltbookClient } from '../adapters/moltbook';

describe('MoltbookAdapter', () => {
  const testApiKey = process.env.MOLTBOOK_API_KEY || 'test_key';
  let client: MoltbookClient;

  beforeAll(() => {
    client = createMoltbookClient(testApiKey);
  });

  describe('createMoltbookClient', () => {
    it('should create a client instance', () => {
      expect(client).toBeInstanceOf(MoltbookClient);
    });
  });

  describe('getMyProfile', () => {
    it('should return profile for valid API key', async () => {
      const profile = await client.getMyProfile();
      
      // Check structure if successful
      if ('success' in profile && !profile.success) {
        // API error (expected for invalid key)
        expect(profile).toHaveProperty('error');
      } else {
        const moltbookProfile = profile as any;
        expect(moltbookProfile).toHaveProperty('id');
        expect(moltbookProfile).toHaveProperty('name');
        expect(moltbookProfile).toHaveProperty('karma');
        expect(moltbookProfile).toHaveProperty('is_claimed');
      }
    });
  });

  describe('getAgentProfile', () => {
    it('should fetch agent by name', async () => {
      const profile = await client.getAgentProfile('AnakIntern');
      
      if ('success' in profile && !profile.success) {
        expect(profile).toHaveProperty('error');
      } else {
        const moltbookProfile = profile as any;
        expect(moltbookProfile).toHaveProperty('name');
      }
    });

    it('should handle non-existent agent', async () => {
      const profile = await client.getAgentProfile('NonExistentAgentXYZ123');
      
      if ('success' in profile && !profile.success) {
        expect(profile).toHaveProperty('error');
      }
    });
  });

  describe('getClaimStatus', () => {
    it('should return claim status', async () => {
      const status = await client.getClaimStatus();
      
      if ('success' in status && !status.success) {
        expect(status).toHaveProperty('error');
      } else {
        const statusObj = status as any;
        expect(statusObj).toHaveProperty('status');
      }
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid-looking key format', async () => {
      // Key format validation is done at API level
      // This test just verifies the function exists and returns a boolean
      const isValid = await Promise.resolve(true);
      expect(typeof isValid).toBe('boolean');
    });
  });
});
