import type { HistoryEntry, StationState, SurveyDraft } from "./types";
import { judgeDraft, buildRepairSuggestion } from "./judge";

// 首屏种子数据：每次新登记走与正式补测完全相同的判定链路。
const seedDrafts: (SurveyDraft & { archivedAt: string })[] = [
  {
    building: "大雄宝殿",
    memberNo: "Z-01",
    wood: "楠木",
    jointType: "燕尾榫",
    width: 220,
    height: 220,
    memberLength: 3600,
    defectPos: 120,
    defectDesc: "柱脚糟朽",
    deformation: 6,
    measuredAt: "2026-08-12T09:30",
    archivedAt: "2026-08-12T01:30:00.000Z",
  },
  {
    building: "大雄宝殿",
    memberNo: "L-01",
    wood: "松木",
    jointType: "透榫",
    width: 180,
    height: 240,
    memberLength: 4200,
    defectPos: 2100,
    defectDesc: "梁身微弯",
    deformation: 4,
    measuredAt: "2026-08-14T10:00",
    archivedAt: "2026-08-14T02:00:00.000Z",
  },
  // 补测放行：旧截面 180×240 进入下料，修缮建议按 10mm 变形升级为拨正归安
  {
    building: "大雄宝殿",
    memberNo: "L-01",
    wood: "松木",
    jointType: "透榫",
    width: 176,
    height: 235,
    memberLength: 4200,
    defectPos: 2080,
    defectDesc: "梁身弯曲发展，端部开裂",
    deformation: 10,
    measuredAt: "2026-09-02T14:20",
    archivedAt: "2026-09-02T06:20:00.000Z",
  },
  {
    building: "大雄宝殿",
    memberNo: "D-01",
    wood: "榆木",
    jointType: "半榫",
    width: 90,
    height: 120,
    memberLength: 900,
    defectPos: 60,
    defectDesc: "轻微变形",
    deformation: 2,
    measuredAt: "2026-08-18T11:00",
    archivedAt: "2026-08-18T03:00:00.000Z",
  },
  // 病害位置越界 → 待复核，v1 有效版保留
  {
    building: "大雄宝殿",
    memberNo: "D-01",
    wood: "榆木",
    jointType: "半榫",
    width: 88,
    height: 118,
    memberLength: 900,
    defectPos: 980,
    defectDesc: "卯口劈裂",
    deformation: 5,
    measuredAt: "2026-09-05T15:40",
    archivedAt: "2026-09-05T07:40:00.000Z",
  },
  {
    building: "大雄宝殿",
    memberNo: "B-01",
    wood: "杉木",
    jointType: "箍头榫",
    width: 160,
    height: 200,
    memberLength: 3100,
    defectPos: 90,
    defectDesc: "榫头外闪",
    deformation: 7,
    measuredAt: "2026-08-20T09:00",
    archivedAt: "2026-08-20T01:00:00.000Z",
  },
  // 补测时刻早于上一版 → 待复核，v1 有效版保留
  {
    building: "大雄宝殿",
    memberNo: "B-01",
    wood: "杉木",
    jointType: "箍头榫",
    width: 158,
    height: 198,
    memberLength: 3100,
    defectPos: 85,
    defectDesc: "外闪加剧",
    deformation: 12,
    measuredAt: "2026-08-10T08:00",
    archivedAt: "2026-08-10T00:00:00.000Z",
  },
  {
    building: "观音阁",
    memberNo: "K-01",
    wood: "楠木",
    jointType: "透榫",
    width: 200,
    height: 260,
    memberLength: 4800,
    defectPos: 2300,
    defectDesc: "角梁端糟朽",
    deformation: 9,
    measuredAt: "2026-08-22T13:30",
    archivedAt: "2026-08-22T05:30:00.000Z",
  },
  {
    building: "观音阁",
    memberNo: "D-07",
    wood: "榆木",
    jointType: "半榫",
    width: 95,
    height: 125,
    memberLength: 950,
    defectPos: 70,
    defectDesc: "斗耳磨损",
    deformation: 3,
    measuredAt: "2026-08-25T10:10",
    archivedAt: "2026-08-25T02:10:00.000Z",
  },
  // 截面非正 → 待复核，v1 有效版保留
  {
    building: "观音阁",
    memberNo: "D-07",
    wood: "榆木",
    jointType: "半榫",
    width: 0,
    height: 120,
    memberLength: 950,
    defectPos: 66,
    defectDesc: "斗耳磨穿",
    deformation: 6,
    measuredAt: "2026-09-06T09:15",
    archivedAt: "2026-09-06T01:15:00.000Z",
  },
];

const edges: [string, string, string][] = [
  ["Z-01", "L-01", "抬梁"],
  ["Z-01", "B-01", "拉结"],
  ["L-01", "D-01", "承托"],
  ["D-01", "B-01", "咬合"],
  ["K-01", "D-07", "承托"],
];

export function buildSeedState(): StationState {
  const state: StationState = { members: {}, graph: { nodes: [], edges: [] }, cutOrders: [] };
  const counters: Record<string, number> = {};
  const cutSeq = { n: 0 };

  for (const draft of seedDrafts) {
    const key = draft.memberNo;
    const member = (state.members[key] ??= { memberNo: key, history: [] });
    const previous = [...member.history].reverse().find((e) => e.status !== "rejected");
    const version = (counters[key] ??= 0) + 1;
    counters[key] = version;
    const result = judgeDraft(draft, previous);

    const base: HistoryEntry = {
      ...draft,
      version,
      status: result.accepted ? "valid" : "pending",
      archivedAt: draft.archivedAt,
    };

    if (result.accepted) {
      // 上一有效版被替代；旧截面进入替换件下料
      if (previous && previous.status === "valid") {
        previous.status = "superseded";
        cutSeq.n += 1;
        state.cutOrders.push({
          id: `XL-${String(cutSeq.n).padStart(3, "0")}`,
          memberNo: previous.memberNo,
          building: previous.building,
          jointType: previous.jointType,
          width: previous.width,
          height: previous.height,
          sourceVersion: previous.version,
          reason: `v${version} 补测放行，沿用旧截面替换`,
          createdAt: draft.archivedAt,
        });
      }
      base.repairSuggestion = buildRepairSuggestion(draft, previous);
    } else {
      base.rejectReason = result.reasons.join("；");
    }
    member.history.push(base);
  }

  const buildings = new Map<string, string>();
  for (const draft of seedDrafts) buildings.set(draft.memberNo, draft.building);
  state.graph.nodes = [...buildings.entries()].map(([id, building]) => ({
    id,
    building,
    label: id,
  }));
  state.graph.edges = edges.map(([from, to, label]) => ({ from, to, label }));

  return state;
}
