// 页面操作：尺寸记录表（最新有效版的截面 / 病害 / 变形）
import type { TimberComponent } from "../types";
import { latestValid, pendingVersions } from "../domain/judgment";
import { fmtTime } from "../format";

export function DimensionTable({ components }: { components: TimberComponent[] }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>尺寸记录表</p>
          <h2>最新有效版截面与变形</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>构件编号</th>
              <th>榫卯类型</th>
              <th>截面（mm）</th>
              <th>病害位置</th>
              <th>变形量</th>
              <th>补测时刻</th>
              <th>版本</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c) => {
              const v = latestValid(c);
              const pendings = pendingVersions(c);
              return (
                <tr key={c.componentId} className={pendings.length ? "row-conflict" : ""}>
                  <td>{c.componentId}</td>
                  {v ? (
                    <>
                      <td>{v.tenonType}</td>
                      <td>
                        {v.sectionWidth}×{v.sectionHeight}
                      </td>
                      <td>{v.diseasePosition}%</td>
                      <td>{v.deformation}mm</td>
                      <td>{fmtTime(v.surveyedAt)}</td>
                      <td>
                        V{v.versionNo}
                        {pendings.map((p) => (
                          <span key={p.versionNo} className="badge pending">
                            待复核 V{p.versionNo}⚠
                          </span>
                        ))}
                      </td>
                    </>
                  ) : (
                    <td colSpan={6} className="conflict-text">
                      暂无有效版，{pendings.length} 版待复核
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
