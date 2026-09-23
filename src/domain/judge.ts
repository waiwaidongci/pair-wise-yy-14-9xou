import type {
  CutOrder,
  GraphNode,
  HistoryEntry,
  JointType,
  Member,
  StationState,
  SurveyDraft,
} from "./types";
import { JOINT_TYPES } from "./types";

// ─────────────────────────────────────────────
// 业务一：判定（adjudication）
// 只管规则与派生读模型，不触碰存档。
// 截面非正、病害位置越界、补测时刻早于上一版 → 不放行，原记录保留。
// ─────────────────────────────────────────────

export interface JudgeResult {
  accepted: boolean;
  reasons: string[];
}

export function judgeDraft(draft: SurveyDraft, previous?: HistoryEntry): JudgeResult {
  const reasons: string[] = [];

  if (!draft.building.trim()) reasons.push("缺少建筑名称");
  if (!draft.memberNo.trim()) reasons.push("缺少构件编号");
  if (!draft.wood.trim()) reasons.push("缺少木材种类");
  if (!JOINT_TYPES.includes(draft.jointType)) reasons.push("榫卯类型不在字典内");
  if (!draft.measuredAt) reasons.push("缺少补测时刻");

  // 截面非正
  if (!(draft.width > 0) || !(draft.height > 0)) {
    reasons.push(`截面尺寸非正（${draft.width}×${draft.height}mm），无法下料`);
  }
  if (!(draft.memberLength > 0)) {
    reasons.push("构件长度非正，无法校核病害位置");
  } else if (
    !(draft.defectPos >= 0) ||
    draft.defectPos > draft.memberLength
  ) {
    // 位置越界
    reasons.push(
      `病害位置 ${draft.defectPos}mm 越界（允许 0 ~ ${draft.memberLength}mm）`
    );
  }
  if (!(draft.deformation >= 0)) reasons.push("变形量不可为负");

  // 补测时刻早于上一版（驳回记录不参与比较）
  if (previous && draft.measuredAt && draft.measuredAt <= previous.measuredAt) {
    reasons.push(
      `补测时刻 ${draft.measuredAt} 不晚于上一版 ${previous.measuredAt}（v${previous.version}）`
    );
  }

  return { accepted: reasons.length === 0, reasons };
}

// ── 版本链读取 ──

/** 最新一次存档（含待复核）；驳回记录不参与“上一版”比较 */
export function latestEntry(member: Member | undefined): HistoryEntry | undefined {
  if (!member || member.history.length === 0) return undefined;
  for (let i = member.history.length - 1; i >= 0; i--) {
    if (member.history[i].status !== "rejected") return member.history[i];
  }
  return undefined;
}

/** 最新有效版（放行后生成修缮建议、进入施工清单的那一版） */
export function latestValid(member: Member | undefined): HistoryEntry | undefined {
  if (!member) return undefined;
  return [...member.history].reverse().find((e) => e.status === "valid");
}

export function pendingEntries(member: Member | undefined): HistoryEntry[] {
  if (!member) return [];
  return member.history.filter((e) => e.status === "pending");
}

/** 存在待复核版本即视为冲突，需要在列表与关系图中标出 */
export function memberHasConflict(member: Member | undefined): boolean {
  return pendingEntries(member).length > 0;
}

export function allMembers(state: StationState): Member[] {
  return Object.values(state.members).sort((a, b) =>
    a.memberNo.localeCompare(b.memberNo, "zh-Hans-CN")
  );
}

export function findMember(state: StationState, memberNo: string): Member | undefined {
  return state.members[memberNo.trim()];
}

// ── 放行后：修缮建议 ──

export function buildRepairSuggestion(
  draft: SurveyDraft,
  previous?: HistoryEntry
): string {
  const parts: string[] = [];
  const posDesc =
    draft.defectPos <= draft.memberLength * 0.15 ||
    draft.defectPos >= draft.memberLength * 0.85
      ? "端部（榫卯节点）"
      : "身内";

  if (draft.defectDesc.trim()) parts.push(`${posDesc}${draft.defectDesc.trim()}`);

  if (draft.deformation >= 15) parts.push(`变形量 ${draft.deformation}mm 超限，建议落架大修并更换`);
  else if (draft.deformation >= 8) parts.push(`变形量 ${draft.deformation}mm，建议拨正归安`);
  else if (draft.deformation >= 3) parts.push(`变形量 ${draft.deformation}mm，建议支顶加固`);
  else parts.push("变形轻微，继续监测");

  const byJoint: Record<JointType, string> = {
    燕尾榫: "燕尾榫节点重点检查拉结，松解时墩接补强",
    透榫: "透榫贯穿段校核销孔，必要时加销紧固",
    半榫: "半榫入卯深度不足时包镶补长",
    箍头榫: "箍头榫外侧加铁箍，防止榫头劈裂外闪",
  };
  parts.push(byJoint[draft.jointType]);

  if (previous) {
    parts.push(
      `旧截面 ${previous.width}×${previous.height}mm 已按 v${previous.version} 下替换件料`
    );
  }
  return parts.join("；");
}

export function sectionText(e: { width: number; height: number }): string {
  return `${e.width}×${e.height}mm`;
}

// ── 列表与工作台读模型 ──

export interface MemberView {
  member: Member;
  current?: HistoryEntry;
  conflict: boolean;
  defectCount: number;
}

export function memberViews(
  state: StationState,
  jointFilter: JointType | "全部"
): MemberView[] {
  return allMembers(state)
    .map((member) => {
      const current = latestValid(member) ?? latestEntry(member);
      const defectCount = member.history.filter(
        (e) => (e.status === "valid" || e.status === "pending") && e.defectDesc.trim()
      ).length;
      return { member, current, conflict: memberHasConflict(member), defectCount };
    })
    .filter((v) =>
      jointFilter === "全部" ? true : v.current?.jointType === jointFilter
    );
}

export interface FilterCounts {
  total: number;
  byJoint: Record<string, number>;
}

export function filterCounts(
  state: StationState
): FilterCounts {
  const byJoint: Record<string, number> = {};
  JOINT_TYPES.forEach((t) => (byJoint[t] = 0));
  for (const member of allMembers(state)) {
    const cur = latestValid(member) ?? latestEntry(member);
    if (cur) byJoint[cur.jointType] = (byJoint[cur.jointType] ?? 0) + 1;
  }
  return { total: Object.keys(state.members).length, byJoint };
}

export interface StationMetrics {
  memberCount: number;
  defectPoints: number;
  jointKinds: number;
  toRepair: number;
  pendingConflict: number;
  cutCount: number;
}

export function stationMetrics(state: StationState): StationMetrics {
  const members = allMembers(state);
  const jointSet = new Set<string>();
  let defectPoints = 0;
  let toRepair = 0;
  let pendingConflict = 0;

  for (const m of members) {
    const cur = latestValid(m);
    if (cur) {
      jointSet.add(cur.jointType);
      if (cur.defectDesc.trim()) defectPoints += 1;
      if (cur.deformation >= 3) toRepair += 1;
    }
    if (memberHasConflict(m)) pendingConflict += 1;
  }

  return {
    memberCount: members.length,
    defectPoints,
    jointKinds: jointSet.size,
    toRepair,
    pendingConflict,
    cutCount: state.cutOrders.length,
  };
}

/** 施工清单：最新有效版，按变形量从大到小排序 */
export function constructionList(state: StationState): HistoryEntry[] {
  return allMembers(state)
    .map(latestValid)
    .filter((e): e is HistoryEntry => Boolean(e))
    .sort((a, b) => b.deformation - a.deformation);
}

export function cutOrders(state: StationState): CutOrder[] {
  return [...state.cutOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── 关系图：单栋建筑的构件关系视图 ──

export function buildings(state: StationState): string[] {
  const set = new Set(state.graph.nodes.map((n) => n.building));
  return [...set];
}

export interface BuildingGraph {
  building: string;
  nodes: GraphNode[];
  edges: { from: GraphNode; to: GraphNode; label: string }[];
  conflictNodes: Set<string>;
}

export function buildingGraph(state: StationState, building: string): BuildingGraph {
  const nodes = state.graph.nodes.filter((n) => n.building === building);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = state.graph.edges
    .filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
    .map((e) => ({
      from: nodes.find((n) => n.id === e.from)!,
      to: nodes.find((n) => n.id === e.to)!,
      label: e.label,
    }));
  const conflictNodes = new Set<string>();
  for (const n of nodes) {
    if (memberHasConflict(state.members[n.id])) conflictNodes.add(n.id);
  }
  return { building, nodes, edges, conflictNodes };
}
