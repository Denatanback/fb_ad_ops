"use client";

import Link from "next/link";

type ApproachCardProps = {
  approach: {
    id: string;
    name: string;
    _count?: {
      creatives: number;
    } | null;
  };
};

export function ApproachCard({ approach }: ApproachCardProps) {
  return (
    <Link
      href={`/approaches/${approach.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: "140px",
        padding: "24px",
        backgroundColor: "var(--background-panel)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "12px",
        textDecoration: "none",
        color: "var(--text-primary)",
        transition: "all 0.2s ease",
        boxShadow: "var(--shadow-soft)",
        cursor: "pointer",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.transform = "none";
      }}
    >
      <span style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
        {approach.name}
      </span>
      <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: 400 }}>
        {approach._count?.creatives || 0} креативов
      </span>
    </Link>
  );
}
