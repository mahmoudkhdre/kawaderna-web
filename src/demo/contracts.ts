import type { ManagerApprovalResult } from '../domain/leave/managerApproval';
import type { ManagerRejectionResult } from '../domain/leave/managerRejection';
import type { HrResult } from '../domain/leave/hrFinalDecision';
import type { Actor } from '../domain/leave/transitions';
import type { LeaveRequest } from '../domain/leave/types';
import type { DemoSession } from './session';
import type { EmployeeRequestInput, EmployeeRequestView, EmployeeSubmitResult } from './employee';

export interface DemoState {
  session: DemoSession | null;
  requests: LeaveRequest[];
}

/** Controlled page bindings: the owner executes services; pages never submit a replacement list. */
export interface ManagerInboxBinding {
  requests: LeaveRequest[];
  actor: Actor;
  onApprove: (requestId: string, expectedVersion: number) => ManagerApprovalResult;
  onReject: (requestId: string, expectedVersion: number, category: unknown, details: unknown) => ManagerRejectionResult;
}
export interface HrDecisionBinding {
  requests: LeaveRequest[];
  actor: Actor;
  requestId: string | null;
  selectableRequests?: { requestId: string; employeeName: string; decided: boolean }[];
  onSelectRequest?: (requestId: string) => void;
  onDecide: (requestId: string, expectedVersion: number, decision: 'approve' | 'reject', reason?: string) => HrResult;
}
export interface EmployeeBinding {
  requests: EmployeeRequestView[];
  balance: number;
  onSubmit: (input: EmployeeRequestInput) => EmployeeSubmitResult;
}
