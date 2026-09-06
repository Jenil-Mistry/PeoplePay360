import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    transaction: vi.fn(async (cb) => {
      return await cb({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis()
      });
    })
  }
}));

vi.mock('@/lib/actions/auth-helpers', () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({ employeeDbId: 1, role: 'HR', id: 'user_123' }),
  requireReadAccess: vi.fn().mockResolvedValue({ employeeDbId: 1, role: 'HR' }),
  requireWriteAccess: vi.fn().mockResolvedValue({ employeeDbId: 1, role: 'HR' })
}));

vi.mock('@/lib/rbac', () => ({
  canAccessModule: vi.fn().mockReturnValue(true),
  hasWriteAccess: vi.fn().mockReturnValue(true),
  hasReadAccess: vi.fn().mockReturnValue(true)
}));

import { calculateLeaveDays, approveLeaveRequest } from '../lib/actions/time-off';

describe('Time-Off Module', () => {
  describe('calculateLeaveDays', () => {
    it('correctly calculates days for same-day requests (full day)', () => {
      const days = calculateLeaveDays('2026-09-02', '2026-09-02', false);
      expect(days).toBe(1);
    });

    it('correctly calculates days for same-day requests (half day)', () => {
      const days = calculateLeaveDays('2026-09-02', '2026-09-02', true);
      expect(days).toBe(0.5);
    });

    it('correctly calculates days across multiple days excluding weekends', () => {
      // 2026-09-03 is Thursday, 2026-09-08 is Tuesday
      // Thu, Fri, Mon, Tue = 4 days
      const days = calculateLeaveDays('2026-09-03', '2026-09-08', false);
      expect(days).toBe(4);
    });
    
    it('returns 0 if end date is before start date', () => {
      const days = calculateLeaveDays('2026-09-05', '2026-09-01', false);
      expect(days).toBe(0);
    });
  });

  describe('approveLeaveRequest', () => {
    it('should successfully execute if user is HR/Admin', async () => {
      // Because we mock the entire db transaction and auth helpers,
      // it should theoretically resolve to success
      const result = await approveLeaveRequest(1, "Approved");
      expect(result.success).toBe(true);
    });
  });
});
