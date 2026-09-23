// 页面操作：构件清单（待复核版本在此标出冲突）
import type { TimberComponent } from "../types";
import { componentConflicts, effectiveTenon, latestValid, pendingVersions } from "../domain/judgment";
import { fmtTime } from "../format";

interface Props {
  components: TimberComponent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ComponentList({ components, selectedId, onSelect }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>构件清单</p>
          <h2>在册构件（{components.length}）</h2>
        </div>
      </div>
      <div className="comp-list">
        {components.length === 0 && <p className="empty">当前筛选下没有构件。</p>}
        {components.map((c) => {
          const valid = latestValid(c);
          const pendings = pendingVersions(c);
          const conflicts = componentConflicts(c);
          return (
            <button
              key={c.componentId}
              className={`comp-row ${selectedId === c.componentId ? "active" : ""} ${
                conflicts.length ? "has-conflict" : ""
              }`}
              onClick={() => onSelect(c.componentId)}
            >
              <div className="comp-row-head">
                <strong>{c.componentId}</strong>
                <span className="badges">
                  {valid ? (
                    <span className="badge valid">有效 V{valid.versionNo}</span>
                  ) : (
                    <span className="badge none">无有效版</span>
                  )}
                  {pendings.map((p) => (
                    <span key={p.versionNo} className="badge pending">
                      待复核 V{p.versionNo} ⚠
                    </span>
                  ))}
                </span>
              </div>
              <div className="comp-row-meta">
                {c.building} · {c.wood} · {c.member} · {effectiveTenon(c)}
              </div>
              <div className="comp-row-meta">
                {valid
                  ? `截面 ${valid.sectionWidth}×${valid.sectionHeight}mm · 病害 ${valid.diseasePosition}% · 变形 ${valid.deformation}mm · 补测 ${fmtTime(valid.surveyedAt)}`
                  : "等待有效测绘版本放行"}
              </div>
              {conflicts.length > 0 && (
                <div className="conflict-text">冲突：{conflicts.join("；")}</div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
