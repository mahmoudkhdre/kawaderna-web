import type { ManagerInboxRow } from '../../domain/leave/selectors';

/** Display flag only: mirrors the selector's eligibility flags, no new rule. */
export const isActionable = (row: ManagerInboxRow): boolean => row.canApprove || row.canReject;
