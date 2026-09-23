// 页面操作：新增测绘 / 补测录入表单（版本放行台入口）
import { useMemo, useState, type FormEvent } from "react";
import {
  MEMBER_KINDS,
  TENON_TYPES,
  WOOD_TYPES,
  type ArchiveState,
  type MemberKind,
  type SurveyInput,
  type TenonType,
} from "../types";
import { latestValid, pendingVersions } from "../domain/judgment";

interface Props {
  archive: ArchiveState;
  onSubmit: (input: SurveyInput) => void;
}

function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function SurveyForm({ archive, onSubmit }: Props) {
  const [componentId, setComponentId] = useState("");
  const [building, setBuilding] = useState("");
  const [wood, setWood] = useState(WOOD_TYPES[0]);
  const [member, setMember] = useState<MemberKind>("梁");
  const [tenonType, setTenonType] = useState<TenonType>("透榫");
  const [sectionWidth, setSectionWidth] = useState("180");
  const [sectionHeight, setSectionHeight] = useState("240");
  const [diseasePosition, setDiseasePosition] = useState("50");
  const [deformation, setDeformation] = useState("0");
  const [surveyedAt, setSurveyedAt] = useState(nowLocal);

  const existing = useMemo(
    () => archive.components.find((c) => c.componentId === componentId.trim()) ?? null,
    [archive, componentId]
  );
  const buildings = useMemo(
    () => [...new Set(archive.components.map((c) => c.building))],
    [archive]
  );
  const woodOptions =
    existing && !WOOD_TYPES.includes(existing.wood)
      ? [existing.wood, ...WOOD_TYPES]
      : WOOD_TYPES;
  const valid = existing ? latestValid(existing) : null;
  const pendingCount = existing ? pendingVersions(existing).length : 0;
  const nextVersionNo = existing
    ? existing.versions.reduce((m, v) => Math.max(m, v.versionNo), 0) + 1
    : 1;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = new Date(surveyedAt);
    onSubmit({
      componentId: componentId.trim(),
      building: existing ? existing.building : building.trim(),
      wood: existing ? existing.wood : wood,
      member: existing ? existing.member : member,
      tenonType,
      sectionWidth: Number(sectionWidth),
      sectionHeight: Number(sectionHeight),
      diseasePosition: Number(diseasePosition),
      deformation: Number(deformation),
      surveyedAt: Number.isNaN(t.getTime()) ? "" : t.toISOString(),
    });
    setSurveyedAt(nowLocal());
  };

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>版本放行台 · 页面操作</p>
          <h2>{existing ? `补测 ${existing.componentId}` : "新增测绘"}</h2>
        </div>
        <button className="primary" type="submit" form="survey-form">
          {existing ? `提交补测 V${nextVersionNo}` : "提交首版测绘"}
        </button>
      </div>
      <form id="survey-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label>
            <span>构件编号（全库唯一）</span>
            <input
              value={componentId}
              onChange={(e) => setComponentId(e.target.value)}
              placeholder="如 ZZ-L-03"
              required
            />
          </label>
          <label>
            <span>建筑名称</span>
            <input
              value={existing ? existing.building : building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="如 昭忠祠正殿"
              list="building-list"
              disabled={!!existing}
              required
            />
            <datalist id="building-list">
              {buildings.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </label>
          <label>
            <span>木材种类</span>
            <select
              value={existing ? existing.wood : wood}
              onChange={(e) => setWood(e.target.value)}
              disabled={!!existing}
            >
              {woodOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>构件部位</span>
            <select
              value={existing ? existing.member : member}
              onChange={(e) => setMember(e.target.value as MemberKind)}
              disabled={!!existing}
            >
              {MEMBER_KINDS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>榫卯类型</span>
            <select value={tenonType} onChange={(e) => setTenonType(e.target.value as TenonType)}>
              {TENON_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>补测时刻</span>
            <input
              type="datetime-local"
              value={surveyedAt}
              onChange={(e) => setSurveyedAt(e.target.value)}
              required
            />
          </label>
          <label>
            <span>截面宽（mm，须为正）</span>
            <input
              type="number"
              step="any"
              value={sectionWidth}
              onChange={(e) => setSectionWidth(e.target.value)}
              required
            />
          </label>
          <label>
            <span>截面高（mm，须为正）</span>
            <input
              type="number"
              step="any"
              value={sectionHeight}
              onChange={(e) => setSectionHeight(e.target.value)}
              required
            />
          </label>
          <label>
            <span>病害位置（沿构件 0–100%）</span>
            <input
              type="number"
              step="any"
              value={diseasePosition}
              onChange={(e) => setDiseasePosition(e.target.value)}
              required
            />
          </label>
          <label>
            <span>变形量（mm）</span>
            <input
              type="number"
              step="any"
              value={deformation}
              onChange={(e) => setDeformation(e.target.value)}
              required
            />
          </label>
        </div>
        {componentId.trim() && (
          <p className={`hint ${existing ? "" : "ok"}`}>
            {existing
              ? `编号已建档（${existing.building} · ${existing.wood} · ${existing.member}），当前有效版 ${
                  valid ? `V${valid.versionNo}` : "无"
                }、待复核 ${pendingCount} 版，本次提交记为补测 V${nextVersionNo}；判定不过将保留原记录。`
              : "新编号，提交后建立构件档案（构件编号全库不重复）。"}
          </p>
        )}
      </form>
    </section>
  );
}
