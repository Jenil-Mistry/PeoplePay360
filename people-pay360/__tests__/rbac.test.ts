import { describe, it, expect } from 'vitest';
import { canAccessModule, hasWriteAccess, RoleType } from '../lib/rbac';

describe('RBAC Utilities', () => {
  describe('canAccessModule', () => {
    it('allows Admin access to all modules', () => {
      expect(canAccessModule('Admin', 'payroll_process')).toBe(true);
      expect(canAccessModule('Admin', 'attendance_all')).toBe(true);
      expect(canAccessModule('Admin', 'settings_manage')).toBe(true);
    });

    it('allows HR access to permitted modules', () => {
      expect(canAccessModule('HR', 'employees_manage')).toBe(true);
      expect(canAccessModule('HR', 'attendance_correct_others')).toBe(true);
      // HR usually doesn't process payroll directly unless configured
      expect(canAccessModule('HR', 'payroll_process')).toBe(false); 
    });

    it('restricts Employee access to their own modules', () => {
      expect(canAccessModule('Employee', 'attendance_own')).toBe(true);
      expect(canAccessModule('Employee', 'payslips_own')).toBe(true);
      
      expect(canAccessModule('Employee', 'employees_manage')).toBe(false);
      expect(canAccessModule('Employee', 'payroll_process')).toBe(false);
    });
  });

  describe('hasWriteAccess', () => {
    it('correctly validates write access', () => {
      expect(hasWriteAccess('Admin', 'payroll_process')).toBe(true);
      expect(hasWriteAccess('Employee', 'attendance_own')).toBe(true); // they can log their own
      expect(hasWriteAccess('Employee', 'attendance_correct_others')).toBe(false);
    });
  });
});
