import type { StationState } from "../domain/types";
import { buildingGraph, buildings, latestValid } from "../domain/judge";

interface Props {
  state: StationState;
  building: string;
  selected: string | null;
  onSelectBuilding: (b: string) => void;
  onSelectMember: (no: string) => void;
}

export function RelationGraph({
  state,
  building,
  selected,
  onSelectBuilding,
  onSelectMember,
}: Props) {
  const names = buildings(state);
  const graph = buildingGraph(state, building);

  const W = 520;
  const H = 300;
  const pos = (index: number, total: number) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const rows = Math.ceil(total / 2);
    const x = col === 0 ? 130 : W - 130;
    const y = rows === 1 ? H / 2 : 46 + (row * (H - 92)) / Math.max(1, rows - 1);
    return { x, y };
  };
  const coords = new Map(graph.nodes.map((n, i) => [n.id, pos(i, graph.nodes.length)]));

  return (
    <div className="graph">
      <div className="graph-tabs">
        {names.map((b) => (
          <button
            key={b}
            className={b === building ? "tab active" : "tab"}
            onClick={() => onSelectBuilding(b)}
          >
            {b}
          </button>
        ))}
      </div>
      {graph.nodes.length === 0 ? (
        <p className="muted">该建筑暂无构件。</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="graph-svg">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="arrow-fill" />
            </marker>
          </defs>
          {graph.edges.map((e, i) => {
            const a = coords.get(e.from.id)!;
            const b = coords.get(e.to.id)!;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return (
              <g key={i}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="edge" markerEnd="url(#arrow)" />
                <text x={mx} y={my - 6} textAnchor="middle" className="edge-label">
                  {e.label}
                </text>
              </g>
            );
          })}
          {graph.nodes.map((n) => {
            const p = coords.get(n.id)!;
            const conflict = graph.conflictNodes.has(n.id);
            const cur = latestValid(state.members[n.id]);
            return (
              <g
                key={n.id}
                className={`gnode ${selected === n.id ? "gnode-selected" : ""}`}
                onClick={() => onSelectMember(n.id)}
              >
                <rect
                  x={p.x - 62}
                  y={p.y - 26}
                  width={124}
                  height={52}
                  rx={8}
                  className={conflict ? "node-box node-conflict" : "node-box"}
                />
                <text x={p.x} y={p.y - 2} textAnchor="middle" className="node-label">
                  {n.label}
                </text>
                <text x={p.x} y={p.y + 15} textAnchor="middle" className="node-sub">
                  {cur ? cur.jointType : "—"}
                </text>
                {conflict && (
                  <text x={p.x + 58} y={p.y - 18} textAnchor="middle" className="node-warn">
                    ⚠
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <p className="muted small">
        红框 ⚠ = 该构件存在待复核版本，点击节点可定位清单。
      </p>
    </div>
  );
}
