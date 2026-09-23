// 页面操作：施工清单（最新有效版修缮建议，替换件给出旧截面下料尺寸）
import type { ConstructionItem } from "../domain/judgment";

export function ConstructionList({ items }: { items: ConstructionItem[] }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>施工清单</p>
          <h2>最新有效版修缮建议（{items.length}）</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>构件编号</th>
              <th>建筑</th>
              <th>榫卯类型</th>
              <th>截面（mm）</th>
              <th>变形量</th>
              <th>修缮建议</th>
              <th>替换下料截面</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  当前筛选下没有已放行的有效版。
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.componentId} className={item.cutting ? "row-replace" : ""}>
                <td>{item.componentId}</td>
                <td>{item.building}</td>
                <td>{item.tenonType}</td>
                <td>{item.section}</td>
                <td>{item.deformation}mm</td>
                <td className="suggestion-text">{item.suggestion}</td>
                <td>{item.cutting ? <span className="badge cutting">{item.cutting}</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
