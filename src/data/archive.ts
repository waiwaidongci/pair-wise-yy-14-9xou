// 存档台：档案读写与版本落库。判定见 domain/judgment.ts，页面操作见 App.tsx。
import type { ArchiveState, SurveyInput, SurveyVersion, TimberComponent } from "../types";
import type { JudgmentResult } from "../domain/judgment";

const STORAGE_KEY = "hxyfront-62013.mortise-archive.v1";

export function loadArchive(): ArchiveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ArchiveState;
      if (Array.isArray(parsed.components)) return parsed;
    }
  } catch {
    // 本地档案损坏时回退到示例档案
  }
  return seedArchive();
}

export function saveArchive(state: ArchiveState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时仅保留内存态
  }
}

export function resetArchive(): ArchiveState {
  const seed = seedArchive();
  saveArchive(seed);
  return seed;
}

/**
 * 版本落库：构件编号全库唯一，命中已有编号即记为补测新版。
 * 判定通过 → 旧有效版转历史、新版放行；不通过 → 原记录保留、新版挂待复核。
 */
export function applySurvey(
  state: ArchiveState,
  input: SurveyInput,
  judgment: JudgmentResult,
  suggestion: string
): { next: ArchiveState; version: SurveyVersion } {
  const components = state.components.map((c) => ({ ...c, versions: [...c.versions] }));
  const id = input.componentId.trim();
  let comp = components.find((c) => c.componentId === id);
  if (!comp) {
    comp = {
      componentId: id,
      building: input.building.trim(),
      wood: input.wood,
      member: input.member,
      versions: [],
    };
    components.push(comp);
  }
  const versionNo = comp.versions.reduce((max, v) => Math.max(max, v.versionNo), 0) + 1;
  const version: SurveyVersion = {
    versionNo,
    tenonType: input.tenonType,
    sectionWidth: input.sectionWidth,
    sectionHeight: input.sectionHeight,
    diseasePosition: input.diseasePosition,
    deformation: input.deformation,
    surveyedAt: input.surveyedAt,
    status: judgment.pass ? "valid" : "pending",
    conflicts: judgment.pass ? [] : judgment.conflicts,
    suggestion: judgment.pass ? suggestion : "",
  };
  if (judgment.pass) {
    comp.versions = comp.versions.map((v) =>
      v.status === "valid" ? { ...v, status: "history" as const } : v
    );
  }
  comp.versions.push(version);
  return { next: { components }, version };
}

// —— 示例档案 ——

function sv(
  versionNo: number,
  tenonType: SurveyVersion["tenonType"],
  sectionWidth: number,
  sectionHeight: number,
  diseasePosition: number,
  deformation: number,
  surveyedAt: string,
  status: SurveyVersion["status"],
  conflicts: string[] = [],
  suggestion = ""
): SurveyVersion {
  return {
    versionNo,
    tenonType,
    sectionWidth,
    sectionHeight,
    diseasePosition,
    deformation,
    surveyedAt,
    status,
    conflicts,
    suggestion,
  };
}

export function seedArchive(): ArchiveState {
  return {
    components: [
      {
        componentId: "ZZ-L-03",
        building: "昭忠祠正殿",
        wood: "榆木",
        member: "梁",
        versions: [
          sv(1, "透榫", 180, 240, 12, 6, "2026-03-10T09:00:00+08:00", "history", [], "病害轻微，继续监测"),
          sv(2, "透榫", 178, 238, 8, 9, "2026-06-15T10:30:00+08:00", "valid", [], "病害临近端部，局部墩接"),
        ],
      },
      {
        componentId: "ZZ-Z-01",
        building: "昭忠祠正殿",
        wood: "楠木",
        member: "柱",
        versions: [
          sv(1, "管脚榫", 220, 220, 92, 3, "2026-03-12T14:00:00+08:00", "valid", [], "病害临近端部，局部墩接"),
        ],
      },
      {
        componentId: "ZZ-DG-07",
        building: "昭忠祠正殿",
        wood: "松木",
        member: "斗拱",
        versions: [
          sv(1, "燕尾榫", 120, 160, 40, 22, "2026-04-02T09:20:00+08:00", "valid", [], "变形22mm超限，按旧截面120×160mm下料替换"),
        ],
      },
      {
        componentId: "ZZ-DG-09",
        building: "昭忠祠正殿",
        wood: "松木",
        member: "斗拱",
        versions: [
          sv(1, "半榫", 110, 150, 30, 5, "2026-04-02T09:40:00+08:00", "history", [], "病害轻微，继续监测"),
          sv(2, "半榫", 110, 148, 30, 7, "2026-09-01T08:50:00+08:00", "valid", [], "病害轻微，继续监测"),
          sv(3, "半榫", 108, 146, 30, 8, "2026-08-20T11:00:00+08:00", "pending", [
            "补测时刻早于上一版 V2（2026-09-01T08:50:00+08:00）",
          ]),
        ],
      },
      {
        componentId: "ZZ-F-01",
        building: "昭忠祠正殿",
        wood: "柏木",
        member: "枋",
        versions: [
          sv(1, "燕尾榫", 90, 120, 20, 2, "2026-06-01T09:00:00+08:00", "valid", [], "病害轻微，继续监测"),
          sv(2, "燕尾榫", 0, 120, 20, 2, "2026-09-12T09:30:00+08:00", "pending", [
            "截面尺寸非正（0×120mm）",
          ]),
        ],
      },
      {
        componentId: "CJ-L-01",
        building: "藏经阁",
        wood: "杉木",
        member: "梁",
        versions: [
          sv(1, "燕尾榫", 160, 220, 55, 12, "2026-05-11T15:10:00+08:00", "valid", [], "变形12mm发展，剔补加固并复测"),
        ],
      },
      {
        componentId: "CJ-Z-02",
        building: "藏经阁",
        wood: "杉木",
        member: "柱",
        versions: [
          sv(1, "箍头榫", 200, 200, 95, 25, "2026-05-11T16:00:00+08:00", "valid", [], "变形25mm超限，按旧截面200×200mm下料替换；病害临近端部，局部墩接"),
          sv(2, "箍头榫", 200, 200, 130, 26, "2026-09-10T10:00:00+08:00", "pending", [
            "病害位置越界（130%，允许 0–100%）",
          ]),
        ],
      },
      {
        componentId: "CJ-DG-01",
        building: "藏经阁",
        wood: "松木",
        member: "斗拱",
        versions: [
          sv(1, "馒头榫", 100, 140, 62, 4, "2026-05-12T09:00:00+08:00", "valid", [], "病害轻微，继续监测"),
        ],
      },
    ],
  };
}
