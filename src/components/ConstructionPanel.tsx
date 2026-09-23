import type { JointType, StationState } from "../domain/types";
import { constructionList, cutOrders, sectionText } from "../domain/judge";

function priority(deformation: number): { text: string; cls: string } {
  if (deformation >= 15) return { text: "紧急", cls: "p-emergency" };
  if (deformation >= 8) return { text: "优先", cls: "p-high" };
  if (deformation >= 3) return { text: "计划", cls: "p-mid" };
  return { text: "监测", cls: "p-low" };
}

export function ConstructionPanel({
  state,
  filter,
}: {
  state: StationState;
  filter: JointType | "全部";
}) {
  const list = constructionList(state).filter(
    (e) => filter === "全部" || e.jointType === filter
  );
  const orders = cutOrders(state);

  return (
    <div className="construction">
      <h3>施工清单（最新有效版修缮建议）</h3>
      <div className="table-wrap">
        <table className="ctable">
          <thead>
            <tr>
              <th>优先级</th>
              <th>构件编号</th>
              <th>建筑</th>
              <th>榫卯类型</th>
              <th>截面</th>
              <th>变形量</th>
              <th>修缮建议</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={7} className="muted">当前筛选下没有有效版构件。</td></tr>
            )}
            {list.map((e) => {
              const p = priority(e.deformation);
              return (
                <tr key={e.memberNo}>
                  <td><span className={`pill ${p.cls}`}>{p.text}</span></td>
                  <td><b>{e.memberNo}</b><small> v{e.version}</small></td>
                  <td>{e.building}</td>
                  <td>{e.jointType}</td>
                  <td>{sectionText(e)}</td>
                  <td>{e.deformation}mm</td>
                  <td className="suggestion">{e.repairSuggestion}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="cut-title">替换件下料单（旧截面尺寸）</h3>
      {orders.length === 0 ? (
        <p className="muted">尚无补测放行产生的下料任务。</p>
      ) : (
        <div className="cut-cards">
          {orders.map((o) => (
            <article key={o.id} className="cut-card">
              <header>
                <b>{o.id}</b>
                <span>{o.memberNo} · {o.building}</span>
              </header>
              <p>
                {o.jointType} 毛料截面 <b>{sectionText(o)}</b>
              </p>
              <small>
                尺寸来源 v{o.sourceVersion} · {o.reason} · {o.createdAt.slice(0, 10)}
              </small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
