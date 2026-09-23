import type { HistoryEntry, Member } from "../domain/types";
import { latestValid, pendingEntries } from "../domain/judge";

interface Props {
  member?: Member;
  selectedVersion?: number;
}

/**
 * 病害标记图：以构件长度为比例尺标注病害位置。
 * 有效版=绿色，待复核版=红色描边，越界点画到标尺外并给出红色提示。
 */
export function DefectMarker({ member, selectedVersion }: Props) {
  if (!member) {
    return (
      <div className="marker-empty">
        在构件清单中选择构件，查看病害标记与补测位置。
      </div>
    );
  }

  const current = latestValid(member);
  const length = current?.memberLength ?? member.history[0]?.memberLength ?? 1;
  const W = 460;
  const PAD = 44;
  const scaleX = (pos: number) =>
    PAD + Math.max(0, Math.min(pos, length)) / length * (W - PAD * 2);

  const shown = [current, ...pendingEntries(member)].filter(
    (e): e is HistoryEntry => e !== undefined && e.defectDesc.trim().length > 0
  );

  return (
    <div className="marker-wrap">
      <svg viewBox={`0 0 ${W} 150`} className="marker-svg" role="img" aria-label="病害标记图">
        {/* 构件标尺 */}
        <rect x={PAD} y={58} width={W - PAD * 2} height={34} rx={5} className="beam" />
        <line x1={PAD} y1={104} x2={W - PAD} y2={104} className="ruler" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1={PAD + t * (W - PAD * 2)}
              y1={100}
              x2={PAD + t * (W - PAD * 2)}
              y2={108}
              className="ruler"
            />
            <text
              x={PAD + t * (W - PAD * 2)}
              y={122}
              textAnchor="middle"
              className="ruler-text"
            >
              {Math.round(t * length)}
            </text>
          </g>
        ))}
        <text x={W / 2} y={142} textAnchor="middle" className="ruler-text">
          构件全长 {length}mm
        </text>

        {shown.map((e, i) => {
          const out = e.defectPos < 0 || e.defectPos > length;
          const pending = e.status === "pending";
          const x = out ? W - PAD + 6 : scaleX(e.defectPos);
          const y = pending ? 20 : 75;
          return (
            <g
              key={`${e.version}-${i}`}
              className={selectedVersion === e.version ? "mk-selected" : ""}
            >
              <line x1={x} y1={y + 8} x2={x} y2={92} className={pending ? "mk-pending" : "mk-valid"} />
              <circle
                cx={x}
                cy={y}
                r={9}
                className={pending ? "mk-dot mk-dot-pending" : "mk-dot mk-dot-valid"}
              />
              <text x={x} y={y + 4} textAnchor="middle" className="mk-label">
                v{e.version}
              </text>
              <title>{`v${e.version} 病害位置 ${e.defectPos}mm${out ? "（越界）" : ""}：${e.defectDesc}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="marker-legend">
        <span><i className="lg lg-valid" /> 有效版病害点</span>
        <span><i className="lg lg-pending" /> 待复核版（红），越界点画在标尺外</span>
      </div>
    </div>
  );
}
