import type { Persona } from '../../domain/leave/types';

/** `null` means "not chosen yet": the entry choice is shown. `free` never hides the demo, it only hides the guide. */
export type GuideMode = 'guided' | 'free';

/** The ONLY thing persisted by the guide (key `kawaderna.demo.guide.v1`). No request data, reasons, names or credentials. */
export interface GuideStored {
  v: 1;
  mode: GuideMode | null;
  /** The request the tour follows. Chosen explicitly; never "the latest request". */
  requestId: string | null;
  /** Panel preference only. */
  collapsed: boolean;
}

export type GuideStageId = 'employee' | 'manager' | 'hr' | 'result';
/** `not_applicable` is a real state: a routine request never reaches HR, a rejected one stops. */
export type GuideStageState = 'completed' | 'current' | 'upcoming' | 'not_applicable';
export type GuideStageOutcome = 'approved' | 'rejected' | null;

export interface GuideStageView {
  id: GuideStageId;
  state: GuideStageState;
  /** Set only for a stage that recorded a decision, so a rejection is never drawn as a success. */
  outcome: GuideStageOutcome;
}

/** Derived from real request state on every render. Never stored. */
export type GuidePhase =
  | 'no_request'
  | 'missing'
  | 'awaiting_manager'
  | 'awaiting_hr'
  | 'approved_routine'
  | 'approved_after_hr'
  | 'rejected_manager'
  | 'rejected_hr'
  | 'unknown';

/** Whether the tracked request needs HR. `unknown` before a request exists. */
export type GuidePath = 'exceptional' | 'routine' | 'unknown';

/** What the guide button does. A role switch is only ever "sign out and show the login screen". */
export type GuideAction =
  | { kind: 'switch'; target: Persona }
  | { kind: 'none' }
  | { kind: 'restart' };

/** The minimum a request may reveal to the guide: no names, balance, reasons or attachments. */
export interface GuideFacts {
  requestId: string;
  status: string;
  stage: string;
  terminalReason: string | null;
  hasHrStep: boolean;
  managerStep: 'pending' | 'approved' | 'rejected' | 'skipped' | 'none';
  hrStep: 'pending' | 'approved' | 'rejected' | 'skipped' | 'none';
}

export interface GuideModel {
  phase: GuidePhase;
  path: GuidePath;
  stages: GuideStageView[];
  progress: { done: number; total: number };
  action: GuideAction;
  terminal: boolean;
  outcome: 'approved' | 'rejected' | null;
  rejectedAt: 'manager' | 'hr' | null;
}
