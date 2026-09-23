// 共享类型：测绘版本、构件档案与补测录入

export type TenonType = "燕尾榫" | "透榫" | "半榫" | "箍头榫" | "管脚榫" | "馒头榫";
export const TENON_TYPES: TenonType[] = ["燕尾榫", "透榫", "半榫", "箍头榫", "管脚榫", "馒头榫"];

export type MemberKind = "柱" | "斗拱" | "梁" | "枋";
export const MEMBER_KINDS: MemberKind[] = ["柱", "斗拱", "梁", "枋"];

export const WOOD_TYPES: string[] = ["楠木", "榆木", "杉木", "松木", "柏木"];

/** valid=最新有效版（已放行） pending=待复核（判定未通过，保留原记录） history=历史版 */
export type VersionStatus = "valid" | "pending" | "history";

export interface SurveyVersion {
  versionNo: number;
  tenonType: TenonType;
  sectionWidth: number; // 截面宽 mm
  sectionHeight: number; // 截面高 mm
  diseasePosition: number; // 病害位置：沿构件长度 0–100%
  deformation: number; // 变形量 mm
  surveyedAt: string; // 补测时刻 ISO
  status: VersionStatus;
  conflicts: string[]; // 待复核版的冲突原因
  suggestion: string; // 仅有效版生成修缮建议
}

export interface TimberComponent {
  componentId: string; // 构件编号，全库唯一
  building: string; // 建筑名称
  wood: string; // 木材种类
  member: MemberKind; // 构件部位
  versions: SurveyVersion[];
}

export interface ArchiveState {
  components: TimberComponent[];
}

/** 新增测绘 / 补测录入 */
export interface SurveyInput {
  componentId: string;
  building: string;
  wood: string;
  member: MemberKind;
  tenonType: TenonType;
  sectionWidth: number;
  sectionHeight: number;
  diseasePosition: number;
  deformation: number;
  surveyedAt: string;
}
