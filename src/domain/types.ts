// 测绘版本放行台 —— 领域模型

export const JOINT_TYPES = ["燕尾榫", "透榫", "半榫", "箍头榫"] as const;
export type JointType = (typeof JOINT_TYPES)[number];

/** 版本状态：有效放行 / 待复核（判定未过） / 已被新版替代 / 复核驳回 */
export type VersionStatus = "valid" | "pending" | "superseded" | "rejected";

/** 一次测绘登记的归一化数据（新增测绘必填：榫卯类型、截面尺寸、病害位置、变形量、补测时刻） */
export interface SurveyDraft {
  building: string;
  memberNo: string;
  wood: string;
  jointType: JointType;
  /** 截面宽 mm */
  width: number;
  /** 截面高 mm */
  height: number;
  /** 构件总长 mm，用于病害位置越界校核 */
  memberLength: number;
  /** 病害位置：距端部 mm，取值域 [0, memberLength] */
  defectPos: number;
  /** 病害描述 */
  defectDesc: string;
  /** 变形量 mm */
  deformation: number;
  /** 补测时刻，本地 datetime-local 格式 YYYY-MM-DDTHH:mm */
  measuredAt: string;
}

/** 存档后的历史版本记录 */
export interface HistoryEntry extends SurveyDraft {
  version: number;
  status: VersionStatus;
  /** 判定未过 / 驳回原因 */
  rejectReason?: string;
  /** 放行时生成的修缮建议 */
  repairSuggestion?: string;
  /** 存档时刻 ISO */
  archivedAt: string;
}

/** 一个构件编号对应一条版本链，编号不重复 */
export interface Member {
  memberNo: string;
  history: HistoryEntry[];
}

export interface GraphNode {
  id: string;
  building: string;
  label: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

/** 旧截面尺寸进入替换件下料的下料单 */
export interface CutOrder {
  id: string;
  memberNo: string;
  building: string;
  jointType: JointType;
  /** 下料沿用的旧截面尺寸 */
  width: number;
  height: number;
  /** 尺寸来源的上一版版本号 */
  sourceVersion: number;
  reason: string;
  createdAt: string;
}

export interface StationState {
  members: Record<string, Member>;
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  cutOrders: CutOrder[];
}
