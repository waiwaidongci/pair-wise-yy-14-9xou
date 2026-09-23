// 页面操作：病害标记图（沿构件长度 0–100% 标出病害点，待复核点标冲突）
import type { TimberComponent } from "../types";
import { latestValid, pendingVersions } from "../domain/judgment";

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function DiseaseMap({ components }: { components: TimberComponent[] }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>病害标记图</p>
          <h2>沿构件长度分布</h2>
        </div>
        <div className="legend">
          <span>
            <i className="dot valid" />
            有效版病害点
          </span>
          <span>
            <i className="dot pending" />
            待复核（冲突）
          </span>
        </div>
      </div>
      <div className="disease-list">
        {components.length === 0 && <p className="empty">当前筛选下没有构件。</p>}
        {components.map((c) => {
          const v = latestValid(c);
          const pendings = pendingVersions(c);
          return (
            <div className="disease-row" key={c.componentId}>
              <div className="disease-label">
                <strong>{c.componentId}</strong>
                <small>{v ? `${v.tenonType} · V${v.versionNo}` : "无有效版"}</small>
              </div>
              <div className="disease-track">
                {[0, 25, 50, 75, 100].map((t) => (
                  <span key={t} className="tick" style={{ left: `${t}%` }} />
                ))}
                {v && (
                  <span
                    className="marker valid"
                    style={{ left: `${clamp(v.diseasePosition)}%` }}
                    title={`V${v.versionNo} 病害 ${v.diseasePosition}%`}
                  />
                )}
                {pendings.map((p) => (
                  <span
                    key={p.versionNo}
                    className="marker pending"
                    style={{ left: `${clamp(p.diseasePosition)}%` }}
                    title={`V${p.versionNo} 待复核：${p.conflicts.join("；")}`}
                  />
                ))}
              </div>
              <div className="disease-value">{v ? `${v.diseasePosition}%` : "—"}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
