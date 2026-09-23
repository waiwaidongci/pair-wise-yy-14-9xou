// 页面操作：单栋建筑构件关系视图（柱—斗拱—梁枋传力层，待复核节点标冲突）
import type { MemberKind, TimberComponent } from "../types";
import { componentConflicts, effectiveTenon, latestValid } from "../domain/judgment";

interface Props {
  buildings: string[];
  activeBuilding: string;
  onBuildingChange: (b: string) => void;
  components: TimberComponent[]; // 已按榫卯类型筛选
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ROWS: { kinds: MemberKind[]; y: number; label: string }[] = [
  { kinds: ["梁", "枋"], y: 70, label: "梁枋层" },
  { kinds: ["斗拱"], y: 180, label: "斗拱层" },
  { kinds: ["柱"], y: 290, label: "柱层" },
];

const W = 720;
const H = 360;

interface Placed {
  comp: TimberComponent;
  x: number;
  y: number;
}

export function RelationGraph({
  buildings,
  activeBuilding,
  onBuildingChange,
  components,
  selectedId,
  onSelect,
}: Props) {
  const inBuilding = components.filter((c) => c.building === activeBuilding);
  const rows = ROWS.map((row) => ({
    ...row,
    nodes: inBuilding.filter((c) => row.kinds.includes(c.member)),
  }));
  const placed: Placed[] = rows.flatMap((row) =>
    row.nodes.map((comp, i) => ({
      comp,
      x: ((i + 1) / (row.nodes.length + 1)) * W,
      y: row.y,
    }))
  );

  // 边：相邻非空层之间，上层每个节点连到下层水平距离最近的节点
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const nonEmpty = rows.filter((r) => r.nodes.length > 0);
  for (let r = 0; r < nonEmpty.length - 1; r++) {
    const upper = placed.filter((p) => p.y === nonEmpty[r].y);
    const lower = placed.filter((p) => p.y === nonEmpty[r + 1].y);
    for (const u of upper) {
      const nearest = lower.reduce(
        (best, n) => (Math.abs(n.x - u.x) < Math.abs(best.x - u.x) ? n : best),
        lower[0]
      );
      edges.push({ x1: u.x, y1: u.y, x2: nearest.x, y2: nearest.y });
    }
  }

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>构件关系视图</p>
          <h2>单栋建筑传力关系</h2>
        </div>
        <div className="tabs">
          {buildings.map((b) => (
            <button
              key={b}
              className={b === activeBuilding ? "tab active" : "tab"}
              onClick={() => onBuildingChange(b)}
            >
              {b}
            </button>
          ))}
        </div>
      </div>
      <div className="legend">
        <span>
          <i className="dot valid" />
          有效
        </span>
        <span>
          <i className="dot pending" />
          待复核冲突
        </span>
        <span>点击节点查看历史版本</span>
      </div>
      {placed.length === 0 ? (
        <p className="empty">该建筑在当前筛选下没有构件。</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="relation-graph" role="img">
          {rows.map((r) => (
            <text key={r.label} x={10} y={r.y + 4} className="row-label">
              {r.label}
            </text>
          ))}
          {edges.map((e, i) => (
            <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} className="edge" />
          ))}
          {placed.map((p) => {
            const conflicts = componentConflicts(p.comp);
            const valid = latestValid(p.comp);
            return (
              <g
                key={p.comp.componentId}
                className={`node ${conflicts.length ? "conflict" : ""} ${
                  selectedId === p.comp.componentId ? "active" : ""
                }`}
                transform={`translate(${p.x}, ${p.y})`}
                onClick={() => onSelect(p.comp.componentId)}
              >
                <circle r={26} />
                <text className="node-member" y={-2}>
                  {p.comp.member}
                </text>
                <text className="node-id" y={44}>
                  {p.comp.componentId}
                </text>
                <text className="node-sub" y={59}>
                  {effectiveTenon(p.comp)}
                  {valid ? ` · V${valid.versionNo}` : ""}
                </text>
                {conflicts.length > 0 && (
                  <text className="node-warn" y={-34}>
                    ⚠ 冲突
                  </text>
                )}
                <title>
                  {p.comp.componentId}
                  {conflicts.length ? ` 冲突：${conflicts.join("；")}` : ""}
                </title>
              </g>
            );
          })}
        </svg>
      )}
    </section>
  );
}
