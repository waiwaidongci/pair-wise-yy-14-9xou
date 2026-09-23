import { useSyncExternalStore } from "react";
import type { HistoryEntry, JointType, StationState, SurveyDraft } from "./types";
import { JOINT_TYPES } from "./types";
import { appendSurvey, getState, rejectPending, resetStation, subscribe } from "./archive";
import { findMember, latestEntry, latestValid } from "./judge";

// ─────────────────────────────────────────────
// 业务三：页面操作（page operations）
// 测绘页只通过本模块读写台账：表单归一化、补测预填、
// 放行/驳回动作、React 订阅绑定都收在这里。
// ─────────────────────────────────────────────

export interface RawFormValues {
  building: string;
  memberNo: string;
  wood: string;
  jointType: JointType;
  width: string;
  height: string;
  memberLength: string;
  defectPos: string;
  defectDesc: string;
  deformation: string;
  measuredAt: string;
}

export function nowLocalInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function blankForm(): RawFormValues {
  return {
    building: "",
    memberNo: "",
    wood: "",
    jointType: JOINT_TYPES[0],
    width: "",
    height: "",
    memberLength: "",
    defectPos: "",
    defectDesc: "",
    deformation: "",
    measuredAt: nowLocalInput(),
  };
}

function toNum(v: string): number {
  const t = v.trim();
  if (t === "") return NaN;
  return Number(t);
}

/** 补测：沿用上一版档案，补测时刻更新为当前，编号不重复（不可改） */
export function prefillFrom(entry: HistoryEntry): RawFormValues {
  return {
    building: entry.building,
    memberNo: entry.memberNo,
    wood: entry.wood,
    jointType: entry.jointType,
    width: String(entry.width),
    height: String(entry.height),
    memberLength: String(entry.memberLength),
    defectPos: String(entry.defectPos),
    defectDesc: entry.defectDesc,
    deformation: String(entry.deformation),
    measuredAt: nowLocalInput(),
  };
}

export type ParseIssue = { field: keyof RawFormValues; message: string };

export interface ParseResult {
  draft?: SurveyDraft;
  issues: ParseIssue[];
}

export function parseForm(raw: RawFormValues): ParseResult {
  const issues: ParseIssue[] = [];
  if (!raw.building.trim()) issues.push({ field: "building", message: "填写建筑名称" });
  if (!raw.memberNo.trim()) issues.push({ field: "memberNo", message: "填写构件编号" });
  if (!raw.wood.trim()) issues.push({ field: "wood", message: "填写木材种类" });
  if (!raw.measuredAt) issues.push({ field: "measuredAt", message: "选择补测时刻" });

  const width = toNum(raw.width);
  const height = toNum(raw.height);
  if (!(width > 0)) issues.push({ field: "width", message: "截面宽须为正数" });
  if (!(height > 0)) issues.push({ field: "height", message: "截面高须为正数" });

  const memberLength = toNum(raw.memberLength);
  if (!(memberLength > 0))
    issues.push({ field: "memberLength", message: "构件长度须为正数" });

  const defectPos = toNum(raw.defectPos);
  if (!(defectPos >= 0)) issues.push({ field: "defectPos", message: "病害位置须 ≥ 0" });
  else if (memberLength > 0 && defectPos > memberLength)
    issues.push({ field: "defectPos", message: `超过构件长度 ${memberLength}mm` });

  const deformation = toNum(raw.deformation);
  if (!(deformation >= 0))
    issues.push({ field: "deformation", message: "变形量须 ≥ 0" });

  if (issues.length > 0) return { issues };

  return {
    issues: [],
    draft: {
      building: raw.building.trim(),
      memberNo: raw.memberNo.trim(),
      wood: raw.wood.trim(),
      jointType: raw.jointType,
      width,
      height,
      memberLength,
      defectPos,
      defectDesc: raw.defectDesc.trim(),
      deformation,
      measuredAt: raw.measuredAt,
    },
  };
}

export type SubmitResult =
  | { kind: "invalid"; issues: ParseIssue[] }
  | { kind: "accepted"; message: string; cutOrder?: string }
  | { kind: "pending"; message: string };

/** 页面动作：提交一次测绘（新增 / 补测同路），返回给页面的操作反馈 */
export function submitSurvey(raw: RawFormValues, state: StationState): SubmitResult {
  const parsed = parseForm(raw);
  if (!parsed.draft) return { kind: "invalid", issues: parsed.issues };

  const existing = findMember(state, parsed.draft.memberNo);
  const isFollowup = Boolean(existing);
  const outcome = appendSurvey(parsed.draft);

  if (outcome.accepted) {
    const base = isFollowup
      ? `v${outcome.entry.version} 已放行，修缮建议已生成并进入施工清单`
      : `新构件 ${outcome.entry.memberNo} 已建档放行（v1）`;
    return {
      kind: "accepted",
      message: outcome.cutOrder
        ? `${base}；旧截面 ${outcome.cutOrder.width}×${outcome.cutOrder.height}mm 已进入下料单 ${outcome.cutOrder.id}`
        : base,
      cutOrder: outcome.cutOrder?.id,
    };
  }
  return {
    kind: "pending",
    message: `v${outcome.entry.version} 判定未过，挂起待复核；原记录保留。原因：${outcome.reasons.join("；")}`,
  };
}

/** 页面动作：复核驳回待复核版本，冲突解除 */
export function rejectReview(
  memberNo: string,
  version: number,
  reviewNote: string
): boolean {
  return rejectPending(memberNo, version, reviewNote);
}

export function resetToSeed(): void {
  resetStation();
}

/** 页面动作：按编号取补测预填底单（最新有效版优先，否则取最近一次存档） */
export function followupSource(
  state: StationState,
  memberNo: string
): HistoryEntry | undefined {
  const member = findMember(state, memberNo);
  return latestValid(member) ?? latestEntry(member);
}

/** 提交后取最新台账里的底单，便于连续补测 */
export function freshFollowupSource(memberNo: string): RawFormValues | undefined {
  const src = followupSource(getState(), memberNo);
  return src ? prefillFrom(src) : undefined;
}

/** React 绑定：页面只订阅，不直接操作存档 */
export function useStation(): StationState {
  return useSyncExternalStore(subscribe, getState, getState);
}
