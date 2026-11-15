import { formatRejectionReason, ReasonFailure } from './rejectionReason';
import { canManagerDecide } from './selectors';
import { managerReject, TransitionError } from './transitions';
import type { Actor } from './transitions';
import { Persona } from './types';
import type { LeaveRequest } from './types';

export const RejectionFailure = { NOT_FOUND: 'not_found', ...TransitionError, ...ReasonFailure } as const;
export type RejectionFailure = typeof RejectionFailure[keyof typeof RejectionFailure];
export type ManagerRejectionResult =
  | { ok: true; requests: LeaveRequest[]; request: LeaveRequest }
  | { ok: false; error: RejectionFailure };

/** Revalidates against the latest list, then delegates the only mutation to managerReject. */
export const rejectAsManager = (
  requests: LeaveRequest[], requestId: string, actor: Actor, now: Date, expectedVersion: number,
  category: unknown, details: unknown,
): ManagerRejectionResult => {
  const current = requests.find((r) => r.requestId === requestId);
  if (!current) return { ok: false, error: RejectionFailure.NOT_FOUND };
  if (actor.role !== Persona.MANAGER || current.managerId !== actor.id) return { ok: false, error: RejectionFailure.UNAUTHORIZED };
  if (current.isStaleVersion || current.version !== expectedVersion) return { ok: false, error: RejectionFailure.STALE_VERSION };
  if (!canManagerDecide(current, actor.id)) return { ok: false, error: RejectionFailure.INVALID_STATE };
  const formatted = formatRejectionReason(category, details);
  if (!formatted.ok) return formatted;
  const result = managerReject(current, actor, now, expectedVersion, formatted.reason);
  if (!result.ok) return result;
  return {
    ok: true,
    request: result.request,
    requests: requests.map((r) => r.requestId === requestId ? result.request : r),
  };
};
