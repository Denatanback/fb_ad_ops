"use client";

import { useState, useTransition } from "react";
import { updateHypothesisAction, createHypothesisAction, deleteHypothesisAction } from "../actions";

type Hypothesis = {
  id: string;
  name: string;
  description: string | null;
  creativeConcept: string | null;
  results: string | null;
  budget: string | null;
};

type ApproachWithHypotheses = {
  id: string;
  name: string;
  hypotheses: Hypothesis[];
};

export function FunnelTree({ approach }: { approach: ApproachWithHypotheses }) {
  const [isPending, startTransition] = useTransition();
  const [newHypothesisName, setNewHypothesisName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newHypothesisName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("name", newHypothesisName);
        await createHypothesisAction(approach.id, fd);
        setNewHypothesisName("");
      } catch (err: any) {
        setError(err.message || "Ошибка создания гипотезы");
      }
    });
  }

  return (
    <div style={{ padding: "32px 24px", overflowX: "auto", minHeight: "80vh", fontFamily: "var(--font-sans, system-ui)", backgroundColor: "var(--background)", borderRadius: "16px" }}>
      {error && (
        <div style={{ padding: "16px", background: "rgba(255, 0, 0, 0.1)", color: "#ff4d4f", borderRadius: "8px", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      {/* Root Node */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          padding: "20px 64px",
          background: "var(--background-panel)",
          border: "1px solid var(--border-strong)",
          borderRadius: "16px",
          fontWeight: 700,
          fontSize: "24px",
          color: "var(--text-primary)",
          boxShadow: "var(--shadow-soft)",
          position: "relative",
          zIndex: 2,
          marginBottom: "32px",
        }}>
          {approach.name}
        </div>

        {/* Hypotheses Row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "40px", flexWrap: "wrap", justifyContent: "center" }}>
          {approach.hypotheses.map((hypo) => (
            <div key={hypo.id} style={{ width: "320px", flexShrink: 0 }}>
              <div style={{
                width: "100%",
                background: "var(--background-panel)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "var(--shadow-soft)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                transition: "transform 0.2s ease",
              }}
              onMouseOver={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseOut={e => e.currentTarget.style.transform = "none"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "18px", color: "var(--text-primary)" }}>{hypo.name}</span>
                  <button
                    onClick={() => {
                       if (confirm("Удалить гипотезу?")) {
                         startTransition(() => deleteHypothesisAction(hypo.id));
                       }
                    }}
                    style={{ background: "none", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--text-secondary)", fontSize: "12px", fontWeight: 500, padding: "4px 8px", borderRadius: "4px" }}
                    onMouseOver={e => { e.currentTarget.style.backgroundColor = "rgba(255,0,0,0.1)"; e.currentTarget.style.color = "#ff4d4f"; e.currentTarget.style.borderColor = "rgba(255,0,0,0.2)"; }}
                    onMouseOut={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                  >
                    Удалить
                  </button>
                </div>

                {/* Hypothesis Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <HypothesisBudgetField hypothesis={hypo} />
                  <HypothesisField
                    label="Описание"
                    hypothesis={hypo}
                    fieldName="description"
                  />
                  <HypothesisField
                    label="Концепт креативов"
                    hypothesis={hypo}
                    fieldName="creativeConcept"
                  />
                  <HypothesisField
                    label="Результаты"
                    hypothesis={hypo}
                    fieldName="results"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add New Hypothesis Column */}
          <div style={{ width: "320px", flexShrink: 0 }}>
             <form onSubmit={handleCreate} style={{
                width: "100%",
                background: "var(--background-panel-strong)",
                border: "1px dashed var(--border-strong)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "var(--shadow-soft)",
              }}>
                <span style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-primary)", textAlign: "center" }}>Новая гипотеза</span>
                <input
                  type="text"
                  placeholder="Название гипотезы..."
                  value={newHypothesisName}
                  onChange={e => setNewHypothesisName(e.target.value)}
                  disabled={isPending}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-strong)",
                    background: "var(--background)",
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    width: "100%",
                    boxSizing: "border-box"
                  }}
                />
                <button
                  type="submit"
                  disabled={isPending || !newHypothesisName.trim()}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    background: "var(--accent)",
                    color: "#ffffff",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "15px",
                    transition: "background 0.2s ease"
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--accent-strong)"}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = "var(--accent)"}
                >
                  {isPending ? "Добавление..." : "Добавить гипотезу"}
                </button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function HypothesisBudgetField({ hypothesis }: { hypothesis: Hypothesis }) {
  const initialValue = hypothesis.budget ?? "";
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("name", hypothesis.name);
        fd.append("description", hypothesis.description || "");
        fd.append("creativeConcept", hypothesis.creativeConcept || "");
        fd.append("results", hypothesis.results || "");
        fd.append("budget", currentValue);
        await updateHypothesisAction(hypothesis.id, fd);
      } catch (err) {
        console.error("Failed to update budget", err);
        setCurrentValue(initialValue);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Бюджет ($)
      </span>
      {isEditing ? (
        <input
          type="number"
          min="0"
          step="0.01"
          autoFocus
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--accent)",
            borderRadius: "8px",
            fontSize: "14px",
            fontFamily: "inherit",
            boxSizing: "border-box",
            backgroundColor: "var(--background)",
            color: "var(--text-primary)",
            outline: "none"
          }}
          value={currentValue}
          onChange={e => setCurrentValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          disabled={isPending}
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid transparent",
            backgroundColor: "var(--background-muted)",
            borderRadius: "8px",
            fontSize: "14px",
            cursor: "pointer",
            transition: "all 0.2s",
            color: currentValue ? "var(--text-primary)" : "var(--text-muted)",
            boxSizing: "border-box",
            fontWeight: currentValue ? 600 : 400,
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
          onMouseOut={e => e.currentTarget.style.borderColor = "transparent"}
        >
          {currentValue ? `$${currentValue}` : <span style={{ fontStyle: "italic" }}>Нажмите, чтобы добавить...</span>}
          {isPending && <span style={{ marginLeft: "8px", fontSize: "12px" }}>Сохранение...</span>}
        </div>
      )}
    </div>
  );
}

function HypothesisField({
  label,
  hypothesis,
  fieldName
}: {
  label: string;
  hypothesis: Hypothesis;
  fieldName: "description" | "creativeConcept" | "results";
}) {
  const [isEditing, setIsEditing] = useState(false);
  const initialValue = hypothesis[fieldName] || "";
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (currentValue === (initialValue) && !isEditing) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("name", hypothesis.name);
        fd.append("description", fieldName === "description" ? currentValue : (hypothesis.description || ""));
        fd.append("creativeConcept", fieldName === "creativeConcept" ? currentValue : (hypothesis.creativeConcept || ""));
        fd.append("results", fieldName === "results" ? currentValue : (hypothesis.results || ""));
        fd.append("budget", hypothesis.budget || "");

        await updateHypothesisAction(hypothesis.id, fd);
      } catch (err) {
        console.error("Failed to update hypothesis", err);
        setCurrentValue(initialValue); // reset on error
      }
      setIsEditing(false);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      {isEditing ? (
        <textarea
          autoFocus
          style={{
            width: "100%",
            minHeight: "100px",
            padding: "12px",
            border: "1px solid var(--accent)",
            borderRadius: "8px",
            fontSize: "14px",
            lineHeight: "1.5",
            resize: "vertical",
            fontFamily: "inherit",
            boxSizing: "border-box",
            backgroundColor: "var(--background)",
            color: "var(--text-primary)",
            outline: "none"
          }}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleSave}
          disabled={isPending}
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          style={{
            width: "100%",
            minHeight: "100px",
            padding: "12px",
            border: "1px solid transparent",
            backgroundColor: "var(--background-muted)",
            borderRadius: "8px",
            fontSize: "14px",
            lineHeight: "1.5",
            cursor: "pointer",
            whiteSpace: "pre-wrap",
            transition: "all 0.2s",
            color: currentValue ? "var(--text-primary)" : "var(--text-muted)",
            boxSizing: "border-box"
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
          onMouseOut={e => e.currentTarget.style.borderColor = "transparent"}
        >
          {currentValue ? currentValue : <span style={{ fontStyle: "italic" }}>Нажмите, чтобы добавить...</span>}
          {isPending && <span style={{ marginLeft: "8px", fontSize: "12px" }}>Сохранение...</span>}
        </div>
      )}
    </div>
  );
}
