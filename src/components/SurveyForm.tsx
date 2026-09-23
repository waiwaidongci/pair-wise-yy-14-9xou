import { JOINT_TYPES } from "../domain/types";
import type { RawFormValues, SubmitResult } from "../domain/operations";
import type { ParseIssue } from "../domain/operations";

interface Props {
  values: RawFormValues;
  issues: ParseIssue[];
  followup: boolean;
  feedback: SubmitResult | null;
  onChange: (next: RawFormValues) => void;
  onSubmit: () => void;
  onCancelFollowup: () => void;
}

export function SurveyForm({
  values,
  issues,
  followup,
  feedback,
  onChange,
  onSubmit,
  onCancelFollowup,
}: Props) {
  const set = <K extends keyof RawFormValues>(key: K, v: RawFormValues[K]) =>
    onChange({ ...values, [key]: v });
  const errFor = (f: ParseIssue["field"]) =>
    issues.find((i) => i.field === f)?.message;

  return (
    <div className="survey-form">
      <div className="heading">
        <div>
          <p>新增测绘 / 补测登记</p>
          <h2>{followup ? `对 ${values.memberNo} 发起补测` : "新增测绘"}</h2>
        </div>
        {followup && (
          <button onClick={onCancelFollowup}>改为新增构件</button>
        )}
      </div>

      {followup && (
        <p className="followup-note">
          构件编号沿用不重复；判定通过后上一版截面进入替换件下料，判定未过则原记录保留。
        </p>
      )}

      <div className="field-grid">
        <Field label="建筑名称" error={errFor("building")}>
          <input value={values.building} onChange={(e) => set("building", e.target.value)} placeholder="如：大雄宝殿" />
        </Field>
        <Field label="构件编号" error={errFor("memberNo")}>
          <input
            value={values.memberNo}
            disabled={followup}
            onChange={(e) => set("memberNo", e.target.value)}
            placeholder="如：L-01"
          />
        </Field>
        <Field label="木材种类" error={errFor("wood")}>
          <input value={values.wood} onChange={(e) => set("wood", e.target.value)} placeholder="如：楠木" />
        </Field>
        <Field label="榫卯类型">
          <select value={values.jointType} onChange={(e) => set("jointType", e.target.value as RawFormValues["jointType"])}>
            {JOINT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="截面宽 mm" error={errFor("width")}>
          <input inputMode="numeric" value={values.width} onChange={(e) => set("width", e.target.value)} placeholder="如：180" />
        </Field>
        <Field label="截面高 mm" error={errFor("height")}>
          <input inputMode="numeric" value={values.height} onChange={(e) => set("height", e.target.value)} placeholder="如：240" />
        </Field>
        <Field label="构件总长 mm" error={errFor("memberLength")}>
          <input inputMode="numeric" value={values.memberLength} onChange={(e) => set("memberLength", e.target.value)} placeholder="如：4200" />
        </Field>
        <Field label="病害位置 mm（距端部）" error={errFor("defectPos")}>
          <input inputMode="numeric" value={values.defectPos} onChange={(e) => set("defectPos", e.target.value)} placeholder="0 ~ 构件总长" />
        </Field>
        <Field label="变形量 mm" error={errFor("deformation")}>
          <input inputMode="numeric" value={values.deformation} onChange={(e) => set("deformation", e.target.value)} placeholder="如：6" />
        </Field>
        <Field label="补测时刻" error={errFor("measuredAt")}>
          <input type="datetime-local" value={values.measuredAt} onChange={(e) => set("measuredAt", e.target.value)} />
        </Field>
        <label className="field full">
          <span>病害描述</span>
          <input value={values.defectDesc} onChange={(e) => set("defectDesc", e.target.value)} placeholder="如：端部开裂、柱脚糟朽" />
        </label>
      </div>

      <div className="form-foot">
        <button className="primary" onClick={onSubmit}>提交判定并存档</button>
        {feedback && (
          <span className={`feedback fb-${feedback.kind}`}>
            {feedback.kind === "accepted" && "✓ "}
            {feedback.kind === "pending" && "⚠ "}
            {feedback.kind === "invalid" && "✗ "}
            {feedback.kind === "invalid"
              ? `表单未通过：${feedback.issues.map((i) => i.message).join("；")}`
              : feedback.message}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <em className="field-error">{error}</em>}
    </label>
  );
}
