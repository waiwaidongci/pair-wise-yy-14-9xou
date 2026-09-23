import { useState } from "react";
import type { StationState } from "../domain/types";
import { allMembers, sectionText } from "../domain/judge";
import { rejectReview } from "../domain/operations";

export function ReleaseQueue({ state }: { state: StationState }) {
  const [note, setNote] = useState<Record<string, string>>({});

  const pending = allMembers(state).flatMap((m) =>
    m.history.filter((e) => e.status === "pending").map((e) => ({ member: m, entry: e }))
  );

  return (
    <div className="queue">
      <div className="queue-head">
        <h3>版本放行台 · 待复核队列</h3>
        <span className={pending.length > 0 ? "queue-count hot" : "queue-count"}>
          {pending.length} 条挂起
        </span>
      </div>

      {pending.length === 0 ? (
        <p className="muted">暂无待复核版本，所有补测均已放行。</p>
      ) : (
        <div className="queue-grid">
          {pending.map(({ member, entry }) => {
            const key = `${member.memberNo}-${entry.version}`;
            return (
              <article key={key} className="queue-card">
                <header>
                  <b>{member.memberNo}</b>
                  <span>v{entry.version}</span>
                  <time>{entry.measuredAt.replace("T", " ")}</time>
                </header>
                <p className="q-line">
                  {entry.jointType} · 截面 {sectionText(entry)} · 病害 {entry.defectPos}/
                  {entry.memberLength}mm · 变形 {entry.deformation}mm
                </p>
                <p className="reason">{entry.rejectReason}</p>
                <div className="q-foot">
                  <input
                    placeholder="复核意见（驳回时留痕）"
                    value={note[key] ?? ""}
                    onChange={(e) => setNote((s) => ({ ...s, [key]: e.target.value }))}
                  />
                  <button
                    className="danger"
                    onClick={() => {
                      rejectReview(member.memberNo, entry.version, note[key] ?? "");
                      setNote((s) => {
                        const c = { ...s };
                        delete c[key];
                        return c;
                      });
                    }}
                  >
                    驳回保留原记录
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
