import { describe, expect, it } from 'vitest';
import { INBOX_NOW, managerInboxFixtures as f } from './fixtures';
import { selectEmployeeRejectionReason } from './employeeRejection';
import { rejectAsManager } from './managerRejection';
import { Persona, ApprovalStatus } from './types';

describe('employee authorized rejection read path', () => {
  const rejected = rejectAsManager([f.routine], f.routine.requestId, { id: f.routine.managerId, role: Persona.MANAGER }, INBOX_NOW, 1, 'other', 'سبب واضح');
  if (!rejected.ok) throw new Error(rejected.error);

  it('returns the exact submitted reason to the owning Employee through an allowlist', () => {
    expect(selectEmployeeRejectionReason(rejected.requests, f.routine.requestId, { id: f.routine.employeeId, role: Persona.EMPLOYEE })).toEqual({
      requestId: f.routine.requestId, version: 1, approvalStatus: ApprovalStatus.REJECTED, reason: 'أخرى: سبب واضح',
    });
    const json = JSON.stringify(selectEmployeeRejectionReason(rejected.requests, f.routine.requestId, { id: f.routine.employeeId, role: Persona.EMPLOYEE }));
    for (const privateField of ['balanceBefore', 'auditHistory', 'riskFlags', 'managerId', 'attachmentMetadata']) expect(json).not.toContain(privateField);
  });

  it('denies other employees, Manager, HR and unknown request', () => {
    for (const actor of [
      { id: 'EMP-OTHER', role: Persona.EMPLOYEE },
      { id: f.routine.managerId, role: Persona.MANAGER },
      { id: 'HR-1', role: Persona.HR },
    ]) expect(selectEmployeeRejectionReason(rejected.requests, f.routine.requestId, actor)).toBeNull();
    expect(selectEmployeeRejectionReason(rejected.requests, 'NOPE', { id: f.routine.employeeId, role: Persona.EMPLOYEE })).toBeNull();
  });

  it('returns no reason for non-rejected state or missing Manager decision', () => {
    const actor = { id: f.routine.employeeId, role: Persona.EMPLOYEE };
    expect(selectEmployeeRejectionReason([f.routine], f.routine.requestId, actor)).toBeNull();
    expect(selectEmployeeRejectionReason([{ ...rejected.request, auditHistory: f.routine.auditHistory }], f.routine.requestId, actor)).toBeNull();
  });
});
