// 页面操作：组装放行台页面。提交测绘 → 判定（domain/judgment）→ 存档（data/archive）→ 反馈放行结果。
import { useMemo, useState } from "react";
import "./styles.css";
import { TENON_TYPES, type ArchiveState, type SurveyInput, type TenonType } from "./types";
import {
  buildSuggestion,
  constructionList,
  effectiveTenon,
  judgeSurvey,
  latestValid,
  pendingVersions,
} from "./domain/judgment";
import { applySurvey, loadArchive, resetArchive, saveArchive } from "./data/archive";
import { SurveyForm } from "./components/SurveyForm";
import { ComponentList } from "./components/ComponentList";
import { VersionHistory } from "./components/VersionHistory";
import { DimensionTable } from "./components/DimensionTable";
import { DiseaseMap } from "./components/DiseaseMap";
import { RelationGraph } from "./components/RelationGraph";
import { ConstructionList } from "./components/ConstructionList";

type TenonFilter = "全部" | TenonType;

function App() {
  const [archive, setArchive] = useState<ArchiveState>(loadArchive);
  const [tenonFilter, setTenonFilter] = useState<TenonFilter>("全部");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeBuilding, setActiveBuilding] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);

  const buildings = useMemo(
    () => [...new Set(archive.components.map((c) => c.building))],
    [archive]
  );
  const building = buildings.includes(activeBuilding) ? activeBuilding : buildings[0] ?? "";

  const filtered = useMemo(
    () =>
      archive.components.filter((c) => tenonFilter === "全部" || effectiveTenon(c) === tenonFilter),
    [archive, tenonFilter]
  );

  const selected =
    archive.components.find((c) => c.componentId === selectedId) ??
    filtered[0] ??
    archive.components[0] ??
    null;

  const items = useMemo(() => constructionList(archive), [archive]);
  const filteredItems = useMemo(
    () => items.filter((i) => tenonFilter === "全部" || i.tenonType === tenonFilter),
    [items, tenonFilter]
  );

  const pendingCount = archive.components.reduce((n, c) => n + pendingVersions(c).length, 0);
  const tenonCount = new Set(archive.components.map(effectiveTenon)).size;

  // 提交测绘：判定 → 存档 → 反馈放行结果
  const handleSubmit = (input: SurveyInput) => {
    const comp = archive.components.find((c) => c.componentId === input.componentId);
    const prev = comp ? latestValid(comp) : null;
    const judgment = judgeSurvey(input, prev);
    const suggestion = judgment.pass ? buildSuggestion(input, prev) : "";
    const { next, version } = applySurvey(archive, input, judgment, suggestion);
    saveArchive(next);
    setArchive(next);
    setSelectedId(input.componentId);
    setNotice(
      judgment.pass
        ? {
            kind: "ok",
            text: `${input.componentId} V${version.versionNo} 判定通过，已放行：修缮建议已生成并进入施工清单。`,
          }
        : {
            kind: "warn",
            text: `${input.componentId} V${version.versionNo} 判定未通过，已保留原记录、挂为待复核：${judgment.conflicts.join("；")}`,
          }
    );
  };

  const handleReset = () => {
    setArchive(resetArchive());
    setSelectedId(null);
    setTenonFilter("全部");
    setNotice(null);
  };

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62013 · 古建木结构 · 版本放行台</p>
        <h1>木结构榫卯构件测绘</h1>
        <span>
          补测提交后先经判定台校核：截面非正、病害位置越界或补测时刻早于上一版时保留原记录；
          判定通过的最新有效版生成修缮建议并进入施工清单，旧截面尺寸转入替换件下料；
          待复核版本在构件清单与关系图中标出冲突。判定、存档与页面操作分置三处业务代码。
        </span>
        <div className="hero-actions">
          <button onClick={handleReset}>恢复示例档案</button>
        </div>
      </section>

      <section className="metrics">
        <article>
          <small>构件数量</small>
          <strong>{archive.components.length}</strong>
        </article>
        <article>
          <small>待复核冲突</small>
          <strong>{pendingCount}</strong>
        </article>
        <article>
          <small>榫卯类型</small>
          <strong>{tenonCount}</strong>
        </article>
        <article>
          <small>施工清单</small>
          <strong>{items.length}</strong>
        </article>
      </section>

      {notice && (
        <div className={`notice ${notice.kind}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)}>知道了</button>
        </div>
      )}

      <section className="workspace">
        <aside className="panel">
          <h2>榫卯类型筛选</h2>
          <div className="chips">
            {(["全部", ...TENON_TYPES] as TenonFilter[]).map((t) => (
              <button
                key={t}
                className={tenonFilter === t ? "chip active" : "chip"}
                onClick={() => setTenonFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <h2 className="mt">判定口径</h2>
          <ul className="rules">
            <li>构件编号全库不重复，命中已有编号记为补测新版</li>
            <li>截面宽或高非正 → 保留原记录</li>
            <li>病害位置超出 0–100% → 保留原记录</li>
            <li>补测时刻早于上一有效版 → 保留原记录</li>
            <li>变形 ≥20mm 建议替换，旧截面进入下料</li>
          </ul>
        </aside>
        <SurveyForm archive={archive} onSubmit={handleSubmit} />
      </section>

      <section className="grid-2">
        <ComponentList
          components={filtered}
          selectedId={selected?.componentId ?? null}
          onSelect={setSelectedId}
        />
        <VersionHistory component={selected} />
      </section>

      <DimensionTable components={filtered} />

      <section className="grid-2">
        <DiseaseMap components={filtered} />
        <RelationGraph
          buildings={buildings}
          activeBuilding={building}
          onBuildingChange={setActiveBuilding}
          components={filtered}
          selectedId={selected?.componentId ?? null}
          onSelect={setSelectedId}
        />
      </section>

      <ConstructionList items={filteredItems} />
    </main>
  );
}

export default App;
