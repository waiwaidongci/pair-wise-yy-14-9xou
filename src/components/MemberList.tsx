import type { StationState } from "../domain/types";
import { memberViews, sectionText } from "../domain/judge";
import type { JointType } from "../domain/types";
import { StatusBadge, ConflictBadge } from "./Badges";

interface Props {
  state: StationState;
  jointFilter: JointType | "全部";
  selectedNo: string | null;
  onSelect: (no: string) => void;
  onFollowup: (no: string) => void;
}

export function MemberList({ state, jointFilter, selectedNo, onSelect, onFollowup }: Props) {
  const views = memberViews(state, jointFilter);

  return (
    <div className="member-list">
      <div className="list-head">
        <span>构件编号</span>
        <span>建筑 / 木材</span>
        <span>榫卯 · 最新有效截面</span>
        <span>状态</span>
        <span></span>
      </div>
      {views.length === 0 && <p className="muted">当前筛选下暂无构件。</p>}
      {views.map(({ member, current, conflict }) => {
        const open = selectedNo === member.memberNo;
        return (
          <article
            key={member.memberNo}
            className={`member-row ${open ? "open" : ""} ${conflict ? "row-conflict" : ""}`}
          >
            <div className="row-main" onClick={() => onSelect(member.memberNo)}>
              <span className="cell-no">
                <b>{member.memberNo}</b>
                <ConflictBadge show={conflict} />
              </span>
              <span className="cell-meta">
                {current?.building ?? "—"}
                <small>{current?.wood ?? ""}</small>
              </span>
              <span className="cell-joint">
                {current ? `${current.jointType} · ${sectionText(current)}` : "—"}
                {current && <small>变形 {current.deformation}mm</small>}
              </span>
              <span className="cell-status">
                {current ? <StatusBadge status={current.status} /> : "—"}
              </span>
              <span className="cell-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFollowup(member.memberNo);
                  }}
                >
                  补测
                </button>
              </span>
            </div>

            {open && (
              <div className="version-timeline">
                <h4>历史版本（共 {member.history.length} 版）</h4>
                {[...member.history].reverse().map((e) => (
                  <div key={e.version} className={`vline vline-${e.status}`}>
                    <div className="vline-head">
                      <b>v{e.version}</b>
                      <StatusBadge status={e.status} />
                      <time>{e.measuredAt.replace("T", " ")}</time>
                    </div>
                    <p>
                      {e.jointType} · 截面 {sectionText(e)} · 长 {e.memberLength}mm ·
                      病害 {e.defectPos}mm
                      {e.defectDesc ? `（${e.defectDesc}）` : ""} · 变形 {e.deformation}mm
                    </p>
                    {e.status === "pending" && e.rejectReason && (
                      <p className="reason">未放行：{e.rejectReason}</p>
                    )}
                    {e.status === "rejected" && e.rejectReason && (
                      <p className="reason rejected-note">{e.rejectReason}</p>
                    )}
                    {e.status === "valid" && e.repairSuggestion && (
                      <p className="repair">修缮建议：{e.repairSuggestion}</p>
                    )}
                    {e.status === "superseded" && (
                      <p className="muted small">该版已被更新补测替代，截面尺寸已用于替换件下料。</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
