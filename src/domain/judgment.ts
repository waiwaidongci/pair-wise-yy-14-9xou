// 判定台：补测判校、修缮建议生成与放行口径。只算不写——落库见 data/archive.ts，页面操作见 App.tsx。
import type {
  ArchiveState,
  SurveyInput,
  SurveyVersion,
  TenonType,
  TimberComponent,
} from "../types";

export interface JudgmentResult {
  pass: boolean;
  conflicts: string[];
}

/** 病害位置允许区间：沿构件长度 0–100% */
export const DISEASE_RANGE = { min: 0, max: 100 } as const;
/** 变形量达到该值判定超限，需替换 */
export const DEFORM_REPLACE_MM = 20;
/** 变形量达到该值需加固复测 */
export const DEFORM_WATCH_MM = 10;

/**
 * 补测判定：截面非正、病害位置越界、补测时刻早于上一有效版，任一命中即不通过。
 * 不通过时由存档层保留原记录，新版本挂为待复核。
 */
export function judgeSurvey(input: SurveyInput, prevValid: SurveyVersion | null): JudgmentResult {
  const conflicts: string[] = [];
  if (!input.componentId.trim()) {
    conflicts.push("构件编号缺失");
  }
  if (!(input.sectionWidth > 0) || !(input.sectionHeight > 0)) {
    conflicts.push(`截面尺寸非正（${input.sectionWidth}×${input.sectionHeight}mm）`);
  }
  if (!(input.diseasePosition >= DISEASE_RANGE.min && input.diseasePosition <= DISEASE_RANGE.max)) {
    conflicts.push(
      `病害位置越界（${input.diseasePosition}%，允许 ${DISEASE_RANGE.min}–${DISEASE_RANGE.max}%）`
    );
  }
  const surveyedAt = new Date(input.surveyedAt).getTime();
  if (Number.isNaN(surveyedAt)) {
    conflicts.push("补测时刻缺失");
  } else if (prevValid && surveyedAt < new Date(prevValid.surveyedAt).getTime()) {
    conflicts.push(`补测时刻早于上一版 V${prevValid.versionNo}（${prevValid.surveyedAt}）`);
  }
  return { pass: conflicts.length === 0, conflicts };
}

/**
 * 修缮建议：仅对放行版本生成。变形超限需替换时，旧截面尺寸进入替换件下料。
 */
export function buildSuggestion(input: SurveyInput, prevValid: SurveyVersion | null): string {
  const cutting = prevValid
    ? `${prevValid.sectionWidth}×${prevValid.sectionHeight}mm`
    : `${input.sectionWidth}×${input.sectionHeight}mm`;
  const parts: string[] = [];
  if (input.deformation >= DEFORM_REPLACE_MM) {
    parts.push(`变形${input.deformation}mm超限，按旧截面${cutting}下料替换`);
  } else if (input.deformation >= DEFORM_WATCH_MM) {
    parts.push(`变形${input.deformation}mm发展，剔补加固并复测`);
  }
  if (input.diseasePosition <= 10 || input.diseasePosition >= 90) {
    parts.push("病害临近端部，局部墩接");
  } else if (input.deformation < DEFORM_WATCH_MM) {
    parts.push("病害轻微，继续监测");
  }
  return parts.join("；");
}

// —— 放行口径（只读取数）——

/** 当前有效版（已放行版） */
export function latestValid(component: TimberComponent): SurveyVersion | null {
  return component.versions.find((v) => v.status === "valid") ?? null;
}

/** 待复核版本（判定未通过、保留原记录后挂起） */
export function pendingVersions(component: TimberComponent): SurveyVersion[] {
  return component.versions.filter((v) => v.status === "pending");
}

/** 全部版本，新 → 旧，供历史版本查询 */
export function versionsDesc(component: TimberComponent): SurveyVersion[] {
  return [...component.versions].sort((a, b) => b.versionNo - a.versionNo);
}

/** 列表与筛选使用的榫卯类型：取有效版，无有效版取最新一版 */
export function effectiveTenon(component: TimberComponent): TenonType {
  const valid = latestValid(component);
  if (valid) return valid.tenonType;
  return versionsDesc(component)[0]?.tenonType ?? "透榫";
}

/** 构件全部待复核冲突（去重），用于清单与关系图标冲突 */
export function componentConflicts(component: TimberComponent): string[] {
  return [...new Set(pendingVersions(component).flatMap((v) => v.conflicts))];
}

export interface ConstructionItem {
  componentId: string;
  building: string;
  tenonType: TenonType;
  versionNo: number;
  section: string;
  deformation: number;
  suggestion: string;
  /** 需替换时的下料截面（取自被替换的旧有效版） */
  cutting: string | null;
}

/** 施工清单：每构件取最新有效版及其修缮建议，变形量大的在前 */
export function constructionList(state: ArchiveState): ConstructionItem[] {
  const items: ConstructionItem[] = [];
  for (const c of state.components) {
    const v = latestValid(c);
    if (!v) continue;
    const replacing = v.suggestion.includes("替换");
    const prev = [...c.versions]
      .filter((x) => x.versionNo < v.versionNo && x.status !== "pending")
      .sort((a, b) => b.versionNo - a.versionNo)[0];
    items.push({
      componentId: c.componentId,
      building: c.building,
      tenonType: v.tenonType,
      versionNo: v.versionNo,
      section: `${v.sectionWidth}×${v.sectionHeight}mm`,
      deformation: v.deformation,
      suggestion: v.suggestion,
      cutting: replacing
        ? prev
          ? `${prev.sectionWidth}×${prev.sectionHeight}mm`
          : `${v.sectionWidth}×${v.sectionHeight}mm`
        : null,
    });
  }
  return items.sort((a, b) => b.deformation - a.deformation);
}
