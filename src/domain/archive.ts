import type {
  CutOrder,
  HistoryEntry,
  StationState,
  SurveyDraft,
} from "./types";
import { buildRepairSuggestion, judgeDraft, latestEntry } from "./judge";
import { buildSeedState } from "./seed";

// ─────────────────────────────────────────────
// 业务二：存档（archive / ledger）
// 负责版本台账、关系图节点与下料单持久化，
// 不自己决定放行规则（规则在 judge），也不包含任何页面交互。
// ─────────────────────────────────────────────

const STORAGE_KEY = "mortise-survey-station-v1";

const storage = {
  load(): StationState | undefined {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as StationState;
      if (!parsed.members || !parsed.graph || !Array.isArray(parsed.cutOrders)) {
        return undefined;
      }
      return parsed;
    } catch {
      return undefined;
    }
  },
  save(state: StationState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 隐私模式等场景下降级为仅内存存档
    }
  },
};

let state: StationState = storage.load() ?? buildSeedState();
const listeners = new Set<() => void>();

function commit(next: StationState): void {
  state = next;
  storage.save(state);
  listeners.forEach((fn) => fn());
}

export function getState(): StationState {
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export interface AppendOutcome {
  entry: HistoryEntry;
  accepted: boolean;
  reasons: string[];
  cutOrder?: CutOrder;
}

function nextCutOrderId(state: StationState): string {
  const n = state.cutOrders.length + 1;
  return `XL-${String(n).padStart(3, "0")}`;
}

/**
 * 追加一条测绘版本。
 * - 判定通过且构件已有有效版：旧版置 superseded，旧截面进入替换件下料；
 * - 判定未过：登记为 pending，原记录保持有效并保留；
 * - 构件编号首次出现：在关系图中登记节点。
 */
export function appendSurvey(
  draft: SurveyDraft,
  now: string = new Date().toISOString()
): AppendOutcome {
  const next: StationState = structuredClone(state);
  const memberNo = draft.memberNo.trim();

  let member = next.members[memberNo];
  if (!member) {
    member = { memberNo, history: [] };
    next.members[memberNo] = member;
  }

  const previous = latestEntry(member);
  const result = judgeDraft({ ...draft, memberNo }, previous);
  const version = member.history.length + 1;

  const entry: HistoryEntry = {
    ...draft,
    memberNo,
    version,
    status: result.accepted ? "valid" : "pending",
    archivedAt: now,
  };

  let cutOrder: CutOrder | undefined;
  if (result.accepted) {
    if (previous && previous.status === "valid") {
      const old = member.history.find((e) => e.version === previous.version)!;
      old.status = "superseded";
      cutOrder = {
        id: nextCutOrderId(next),
        memberNo: old.memberNo,
        building: old.building,
        jointType: old.jointType,
        width: old.width,
        height: old.height,
        sourceVersion: old.version,
        reason: `v${version} 补测放行，沿用旧截面替换`,
        createdAt: now,
      };
      next.cutOrders.push(cutOrder);
    }
    entry.repairSuggestion = buildRepairSuggestion({ ...draft, memberNo }, previous);
  } else {
    entry.rejectReason = result.reasons.join("；");
  }

  member.history.push(entry);

  // 新构件进入所属建筑的关系图
  if (!next.graph.nodes.some((n) => n.id === memberNo)) {
    next.graph.nodes.push({ id: memberNo, building: draft.building, label: memberNo });
    const sameBuilding = next.graph.nodes.find(
      (n) => n.building === draft.building && n.id !== memberNo
    );
    if (sameBuilding) {
      next.graph.edges.push({
        from: sameBuilding.id,
        to: memberNo,
        label: draft.jointType,
      });
    }
  }

  commit(next);
  return { entry, accepted: result.accepted, reasons: result.reasons, cutOrder };
}

/**
 * 复核驳回待复核版本：
 * 冲突解除，有效版从未被覆盖、继续有效；被驳回记录留在历史版本中可查。
 */
export function rejectPending(memberNo: string, version: number, reviewNote = ""): boolean {
  const member = state.members[memberNo];
  const entry = member?.history.find((e) => e.version === version);
  if (!member || !entry || entry.status !== "pending") return false;

  const next = structuredClone(state);
  const target = next.members[memberNo].history.find((e) => e.version === version)!;
  target.status = "rejected";
  target.rejectReason = reviewNote.trim()
    ? `复核驳回：${reviewNote.trim()}`
    : "复核驳回：数据无效";
  commit(next);
  return true;
}

export function resetStation(): void {
  commit(buildSeedState());
}

export function clearStation(): void {
  commit({ members: {}, graph: { nodes: [], edges: [] }, cutOrders: [] });
}
