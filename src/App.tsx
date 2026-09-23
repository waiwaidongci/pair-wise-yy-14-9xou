import { useMemo, useState } from "react";
import "./styles.css";
import type { JointType } from "./domain/types";
import { JOINT_TYPES } from "./domain/types";
import { buildings, filterCounts, stationMetrics } from "./domain/judge";
import {
  blankForm,
  followupSource,
  freshFollowupSource,
  prefillFrom,
  resetToSeed,
  submitSurvey,
  useStation,
  type RawFormValues,
  type SubmitResult,
} from "./domain/operations";
import { MemberList } from "./components/MemberList";
import { SurveyForm } from "./components/SurveyForm";
import { ReleaseQueue } from "./components/ReleaseQueue";
import { DefectMarker } from "./components/DefectMarker";
import { RelationGraph } from "./components/RelationGraph";
import { ConstructionPanel } from "./components/ConstructionPanel";

function App() {
  const state = useStation();
  const [jointFilter, setJointFilter] = useState<JointType | "全部">("全部");
  const [selectedNo, setSelectedNo] = useState<string | null>(null);
  const [building, setBuilding] = useState<string>(buildings(state)[0] ?? "");
  const [form, setForm] = useState<RawFormValues>(blankForm());
  const [followup, setFollowup] = useState(false);
  const [feedback, setFeedback] = useState<SubmitResult | null>(null);
  const [issues, setIssues] = useState<Parameters<typeof SurveyForm>[0]["issues"]>([]);

  const counts = useMemo(() => filterCounts(state), [state]);
  const metrics = useMemo(() => stationMetrics(state), [state]);
  const selectedMember = selectedNo ? state.members[selectedNo] : undefined;
  const buildingNames = buildings(state);
  const activeBuilding = buildingNames.includes(building) ? building : buildingNames[0] ?? "";

  const startFollowup = (no: string) => {
    const src = followupSource(state, no);
    if (src) {
      setForm(prefillFrom(src));
      setFollowup(true);
      setFeedback(null);
      setIssues([]);
      setSelectedNo(no);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const cancelFollowup = () => {
    setFollowup(false);
    setForm(blankForm());
    setIssues([]);
  };

  const onSubmit = () => {
    const result = submitSurvey(form, state);
    setFeedback(result);
    if (result.kind === "invalid") {
      setIssues(result.issues);
      return;
    }
    setIssues([]);
    if (result.kind === "accepted") {
      setSelectedNo(form.memberNo);
      setBuilding(form.building);
      // 放行后回到空白新增表；补测则按最新台账预填新一版便于连续登记
      setForm(followup ? freshFollowupSource(form.memberNo) ?? blankForm() : blankForm());
    }
  };

  const metricCards = [
    { label: "构件数量", value: metrics.memberCount },
    { label: "病害点（有效版）", value: metrics.defectPoints },
    { label: "榫卯类型", value: metrics.jointKinds },
    { label: "待修缮", value: metrics.toRepair },
    { label: "待复核冲突", value: metrics.pendingConflict, hot: metrics.pendingConflict > 0 },
    { label: "下料任务", value: metrics.cutCount },
  ];

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62013 · 测绘版本放行台 · Port 62013</p>
        <h1>木结构榫卯构件补测放行</h1>
        <span>
          补测登记先过判定：截面须为正、病害位置不得越界、补测时刻须晚于上一版。
          通过则生成修缮建议进入施工清单，旧截面尺寸进入替换件下料；未通过则挂起待复核，原记录保留并在清单与关系图中标出冲突。
        </span>
      </section>

      <section className="metrics">
        {metricCards.map((m) => (
          <article key={m.label} className={m.hot ? "metric-hot" : ""}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <section className="workspace">
        <aside className="panel sidebar">
          <h2>榫卯类型筛选</h2>
          <div className="chips">
            <button
              className={jointFilter === "全部" ? "chip on" : "chip"}
              onClick={() => setJointFilter("全部")}
            >
              全部 <em>{counts.total}</em>
            </button>
            {JOINT_TYPES.map((t) => (
              <button
                key={t}
                className={jointFilter === t ? "chip on" : "chip"}
                onClick={() => setJointFilter(t)}
              >
                {t} <em>{counts.byJoint[t] ?? 0}</em>
              </button>
            ))}
          </div>

          <div className="rule-card">
            <h3>放行判定规则</h3>
            <ul>
              <li>构件编号不重复；补测沿用原编号</li>
              <li>新增测绘写清：榫卯类型、截面尺寸、病害位置、变形量、补测时刻</li>
              <li>截面宽/高须为正数</li>
              <li>病害位置须在 0 ~ 构件总长 之间</li>
              <li>补测时刻须晚于上一版</li>
            </ul>
            <p className="muted small">判定未过 → 待复核；有效版始终保留直到新有效版放行。</p>
          </div>

          <button
            className="ghost"
            onClick={() => {
              if (window.confirm("恢复出厂演示数据？当前台账将被覆盖。")) {
                resetToSeed();
                setSelectedNo(null);
                cancelFollowup();
                setFeedback(null);
              }
            }}
          >
            恢复演示数据
          </button>
        </aside>

        <section className="panel form-panel">
          <SurveyForm
            values={form}
            issues={issues}
            followup={followup}
            feedback={feedback}
            onChange={(v) => {
              setForm(v);
              setIssues([]);
            }}
            onSubmit={onSubmit}
            onCancelFollowup={cancelFollowup}
          />
        </section>
      </section>

      <section className="panel">
        <ReleaseQueue state={state} />
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>构件清单</p>
            <h2>版本链与历史版本{jointFilter !== "全部" ? ` · ${jointFilter}` : ""}</h2>
          </div>
          <span className="muted small">展开行可查全部历史版本与补测时刻</span>
        </div>
        <MemberList
          state={state}
          jointFilter={jointFilter}
          selectedNo={selectedNo}
          onSelect={(no) => setSelectedNo((cur) => (cur === no ? null : no))}
          onFollowup={startFollowup}
        />
      </section>

      <section className="viz-grid">
        <div className="panel">
          <div className="heading">
            <div>
              <p>病害标记图</p>
              <h2>{selectedMember ? `${selectedNo} 病害位置` : "病害位置标注"}</h2>
            </div>
          </div>
          <DefectMarker member={selectedMember} />
        </div>
        <div className="panel">
          <div className="heading">
            <div>
              <p>单栋建筑</p>
              <h2>构件关系视图</h2>
            </div>
          </div>
          <RelationGraph
            state={state}
            building={activeBuilding}
            selected={selectedNo}
            onSelectBuilding={setBuilding}
            onSelectMember={(no) => {
              setSelectedNo(no);
              setBuilding(state.graph.nodes.find((n) => n.id === no)?.building ?? activeBuilding);
            }}
          />
        </div>
      </section>

      <section className="panel">
        <ConstructionPanel state={state} filter={jointFilter} />
      </section>
    </main>
  );
}

export default App;
