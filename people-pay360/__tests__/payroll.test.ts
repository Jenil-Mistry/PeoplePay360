import { describe, it, expect, vi } from 'vitest';
import { executeRule } from '../lib/payroll-server-engine';

describe('Payroll Engine', () => {
  describe('executeRule', () => {
    it('evaluates basic numeric rule correctly', () => {
      const state = { baseSalary: 5000 };
      executeRule(state, {
        id: 1, structureId: 1, name: 'Bonus', code: 'BONUS', type: 'ALLOWANCE',
        computationType: 'FIXED', amount: 500, percentage: null, 
        baseOnCode: null, formula: null, conditionFormula: null,
        isTaxable: true, isDeduction: false, appliesOnStatus: null,
        statusThreshold: null, isActive: true, sortOrder: 1, createdAt: new Date()
      });
      expect(state.BONUS).toBe(500);
    });

    it('evaluates percentage rule correctly', () => {
      const state = { BASIC: 5000 };
      executeRule(state, {
        id: 2, structureId: 1, name: 'HRA', code: 'HRA', type: 'ALLOWANCE',
        computationType: 'PERCENTAGE', amount: null, percentage: 40, 
        baseOnCode: 'BASIC', formula: null, conditionFormula: null,
        isTaxable: true, isDeduction: false, appliesOnStatus: null,
        statusThreshold: null, isActive: true, sortOrder: 2, createdAt: new Date()
      });
      expect(state.HRA).toBe(2000);
    });

    it('evaluates dynamic formula rule using RPN safely', () => {
      const state = { BASIC: 5000, DA: 1000 };
      executeRule(state, {
        id: 3, structureId: 1, name: 'Special', code: 'SPECIAL', type: 'ALLOWANCE',
        computationType: 'FORMULA', amount: null, percentage: null, 
        baseOnCode: null, formula: 'BASIC 0.10 * DA 0.20 * +', conditionFormula: null,
        isTaxable: true, isDeduction: false, appliesOnStatus: null,
        statusThreshold: null, isActive: true, sortOrder: 3, createdAt: new Date()
      });
      // 5000*0.1 = 500, 1000*0.2 = 200, sum = 700
      expect(state.SPECIAL).toBe(700);
    });

    it('safely handles invalid formula syntax (returns 0)', () => {
      const state = { BASIC: 5000 };
      executeRule(state, {
        id: 4, structureId: 1, name: 'Invalid', code: 'INV', type: 'ALLOWANCE',
        computationType: 'FORMULA', amount: null, percentage: null, 
        baseOnCode: null, formula: 'BASIC + *', conditionFormula: null, // Invalid RPN
        isTaxable: true, isDeduction: false, appliesOnStatus: null,
        statusThreshold: null, isActive: true, sortOrder: 4, createdAt: new Date()
      });
      // Fallbacks to 0 if parsing fails
      expect(state.INV).toBe(0);
    });
    
    it('applies condition formula correctly', () => {
      const state = { BASIC: 10000 };
      // Condition: BASIC > 5000 ? 500 : 0
      executeRule(state, {
        id: 5, structureId: 1, name: 'Cond Bonus', code: 'CB', type: 'ALLOWANCE',
        computationType: 'FIXED', amount: 500, percentage: null, 
        baseOnCode: null, formula: null, conditionFormula: 'BASIC 5000 >',
        isTaxable: true, isDeduction: false, appliesOnStatus: null,
        statusThreshold: null, isActive: true, sortOrder: 5, createdAt: new Date()
      });
      expect(state.CB).toBe(500);

      const state2 = { BASIC: 4000 };
      executeRule(state2, {
        id: 6, structureId: 1, name: 'Cond Bonus', code: 'CB', type: 'ALLOWANCE',
        computationType: 'FIXED', amount: 500, percentage: null, 
        baseOnCode: null, formula: null, conditionFormula: 'BASIC 5000 >',
        isTaxable: true, isDeduction: false, appliesOnStatus: null,
        statusThreshold: null, isActive: true, sortOrder: 6, createdAt: new Date()
      });
      expect(state2.CB).toBeUndefined(); // or 0 depending on implementation (currently undefined if condition fails)
    });
  });
});
