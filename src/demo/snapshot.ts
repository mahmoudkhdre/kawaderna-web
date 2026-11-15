import { z } from 'zod';
import {
  ApprovalStage, ApprovalStatus, AuditEventType, LeaveType, Persona, ProcessingStatus, RiskSeverity, TerminalReason,
} from '../domain/leave/types';
import type {
  ApprovalPathStep, AttachmentMetadata, AuditEvent, LeaveRequest, PartialDayDetails, PolicyResult, RiskFlag,
} from '../domain/leave/types';
import type { DemoState } from './contracts';
import { restoreSession } from './session';
import { createBaselineState } from './state';

export const DEMO_STORAGE_KEY = 'kawaderna.demo.snapshot.v1';
export const DEMO_SCHEMA_VERSION = 2;
export type DemoStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

// Exhaustive shapes deliberately fail type-checking if a domain field is added, including optional Dates.
type ShapeFor<T> = { [K in keyof T]-?: z.ZodType<T[K], unknown> };
const date = z.codec(
  z.iso.datetime().refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value),
  z.date(),
  { decode: value => new Date(value), encode: value => value.toISOString() },
);
const visibility = z.enum(['public', 'manager', 'hr']);
const path = z.strictObject({
  order: z.number().int(), ownerRole: z.enum(['manager', 'hr']), ownerName: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'skipped']), decidedAt: date.optional(), reason: z.string().optional(),
} satisfies ShapeFor<ApprovalPathStep>);
const attachment = z.strictObject({
  id: z.string(), filename: z.string(), size: z.number().nonnegative(), uploadedAt: date, visibilityLevel: visibility,
} satisfies ShapeFor<AttachmentMetadata>);
const risk = z.strictObject({
  severity: z.enum(RiskSeverity), code: z.string(), explanationAr: z.string(), explanationEn: z.string(),
  affectedFields: z.array(z.string()), routeConsequence: z.string(),
} satisfies ShapeFor<RiskFlag>);
const policy = z.strictObject({
  ruleCode: z.string(), passed: z.boolean(), requiresAcknowledgement: z.boolean(),
  requiresElevatedReview: z.boolean(), explanationAr: z.string(),
} satisfies ShapeFor<PolicyResult>);
const partialDay = z.strictObject({
  startTime: z.string().optional(), endTime: z.string().optional(), hours: z.number(),
} satisfies ShapeFor<PartialDayDetails>);
const audit = z.strictObject({
  eventType: z.enum(AuditEventType), actor: z.string(), actorRole: z.enum(Persona), timestamp: date,
  // Audit details are opaque JSON in the existing domain; never guess Dates from string contents.
  details: z.record(z.string(), z.unknown().refine(value => z.json().safeParse(value).success)), visibilityLevel: visibility,
} satisfies ShapeFor<AuditEvent>);

export const demoRequestSchema = z.strictObject({
  requestId: z.string().min(1), version: z.number().int().positive(),
  employeeId: z.string(), employeeName: z.string(), managerId: z.string(), managerName: z.string(),
  leaveType: z.enum(LeaveType), startDate: date, endDate: date, isPartialDay: z.boolean(),
  partialDayDetails: partialDay.optional(), durationWorkingDays: z.number(), note: z.string().optional(),
  attachmentMetadata: z.array(attachment).optional(),
  approvalStatus: z.enum(ApprovalStatus), approvalStage: z.enum(ApprovalStage), processingStatus: z.enum(ProcessingStatus),
  terminalReason: z.enum(TerminalReason).optional(), approvalPath: z.array(path), balanceBefore: z.number(),
  lowBalanceAcknowledged: z.boolean(), riskFlags: z.array(risk), policyResults: z.array(policy),
  submittedAt: date.optional(), effectiveDate: date, slaDueAt: date.optional(), createdAt: date, updatedAt: date,
  auditHistory: z.array(audit), previousVersionId: z.string().optional(), isStaleVersion: z.boolean(),
} satisfies ShapeFor<LeaveRequest>);

const storedSession = z.strictObject({ persona: z.enum(['employee', 'manager', 'hr']), loginId: z.string() })
  .refine(value => restoreSession(value.persona, value.loginId) !== null);
export const demoSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(DEMO_SCHEMA_VERSION), savedAt: date, session: storedSession.nullable(),
  requests: z.array(demoRequestSchema).min(1).refine(items => new Set(items.map(item => item.requestId)).size === items.length),
});
const legacySnapshotSchema = z.strictObject({
  schemaVersion: z.literal(1), savedAt: date,
  session: z.strictObject({ persona: z.enum(['manager', 'hr']), loginId: z.string() })
    .refine(value => restoreSession(value.persona, value.loginId) !== null).nullable(),
  requests: z.array(demoRequestSchema).min(1).refine(items => new Set(items.map(item => item.requestId)).size === items.length),
});
export type SerializedDemoSnapshot = z.input<typeof demoSnapshotSchema>;
export type SnapshotRecoveryReason = 'malformed_json' | 'invalid_snapshot';
export interface SnapshotLoadResult {
  state: DemoState;
  source: 'baseline' | 'snapshot' | 'recovery';
  recoveryReason: SnapshotRecoveryReason | null;
  showRecoveryNotice: boolean;
  storageAvailable: boolean;
}

export const serializeDemoSnapshot = (state: DemoState, savedAt = new Date()): string => JSON.stringify(z.encode(demoSnapshotSchema, {
  schemaVersion: DEMO_SCHEMA_VERSION, savedAt,
  session: state.session ? { persona: state.session.persona, loginId: state.session.loginId } : null,
  requests: state.requests,
}));

/** Access itself can throw (e.g. a blocked browser storage getter). No access at module evaluation. */
export const getSessionStorage = (): DemoStorage | null => {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; }
};

export const loadDemoSnapshot = (storage: DemoStorage | null = getSessionStorage()): SnapshotLoadResult => {
  const baseline: SnapshotLoadResult = {
    state: createBaselineState(), source: 'baseline', recoveryReason: null, showRecoveryNotice: false, storageAvailable: !!storage,
  };
  if (!storage) return baseline;
  let raw: string | null;
  try { raw = storage.getItem(DEMO_STORAGE_KEY); } catch { return { ...baseline, storageAvailable: false }; }
  if (raw === null) return baseline;
  const recover = (recoveryReason: SnapshotRecoveryReason): SnapshotLoadResult => ({
    ...baseline, source: 'recovery', recoveryReason, showRecoveryNotice: true,
  });
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return recover('malformed_json'); }
  const current = demoSnapshotSchema.safeParse(input);
  const legacy = current.success ? null : legacySnapshotSchema.safeParse(input);
  if (!current.success && !legacy?.success) return recover('invalid_snapshot');
  const decoded = current.success ? current.data : legacy?.success ? legacy.data : null;
  if (!decoded) return recover('invalid_snapshot');
  const { session, requests } = decoded;
  return { ...baseline, source: 'snapshot', state: {
    session: session ? restoreSession(session.persona, session.loginId) : null, requests,
  } };
};

export type SnapshotSaveResult = { ok: true } | { ok: false; error: 'storage_unavailable' | 'invalid_state' };
/** A failed write/readback invalidates the snapshot where possible, preventing stale restoration. */
export const saveDemoSnapshot = (state: DemoState, storage: DemoStorage | null = getSessionStorage()): SnapshotSaveResult => {
  if (!storage) return { ok: false, error: 'storage_unavailable' };
  let raw: string;
  try { raw = serializeDemoSnapshot(state); } catch { return { ok: false, error: 'invalid_state' }; }
  try {
    storage.setItem(DEMO_STORAGE_KEY, raw);
    // A successful write alone cannot promise reload persistence when reads are blocked.
    if (storage.getItem(DEMO_STORAGE_KEY) !== raw) throw new Error('Snapshot readback failed');
    return { ok: true };
  } catch {
    try { storage.removeItem(DEMO_STORAGE_KEY); } catch { /* In-memory only; never promise a reload restore. */ }
    return { ok: false, error: 'storage_unavailable' };
  }
};
