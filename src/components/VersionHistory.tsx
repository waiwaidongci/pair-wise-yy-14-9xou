// 页面操作：单构件历史版本查询
import type { TimberComponent } from "../types";
import { versionsDesc } from "../domain/judgment";
import { fmtTime } from "../format";

const STATUS_LABEL = { valid: "有效", pending: "待复核", history: "历史" } as const;

export function VersionHistory({ component }: { component: TimberComponent | null }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>历史版本</p>
          <h2>{component ? `${component.componentId} 版本档案` : "未选择构件"}</h2>
        </div>
      </div>
      {!component && <p className="empty">在构件清单中选择构件查看历史版本。</p>}
      {component && (
        <>
          <p className="meta-line">
            {component.building} · {component.wood} · {component.member} · 共{" "}
            {component.versions.length} 版
          </p>
          <div className="version-list">
            {versionsDesc(component).map((v) => (
              <article key={v.versionNo} className={`version-card ${v.status}`}>
                <header>
                  <strong>V{v.versionNo}</strong>
                  <span className={`badge ${v.status}`}>{STATUS_LABEL[v.status]}</span>
                  <time>{fmtTime(v.surveyedAt)}</time>
                </header>
                <p className="meta-line">
                  {v.tenonType} · 截面 {v.sectionWidth}×{v.sectionHeight}mm · 病害{" "}
                  {v.diseasePosition}% · 变形 {v.deformation}mm
                </p>
                {v.suggestion && <p className="suggestion-text">修缮建议：{v.suggestion}</p>}
                {v.conflicts.length > 0 && (
                  <p className="conflict-text">冲突：{v.conflicts.join("；")}（已保留原记录）</p>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
