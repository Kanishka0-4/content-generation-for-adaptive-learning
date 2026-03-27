"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/* ---------------- TYPES ---------------- */

type Module = {
  module_order: number;
  title: string;
  goal: string;
  topics: string[];
};

type Subject = {
  id: number;
  title: string;
  exam: string | null;
  total_duration: string | null;
};

/* ---------------- ACCENT HELPER ---------------- */
function getAccent(index: number, total: number): string {
  const palette = [
    "#ff7b00","#ff8800","#ff9500","#ffa200",
    "#ffaa00","#ffb700","#ffc300","#ffd000","#ffdd00","#ffea00",
  ];
  const idx = total <= 1 ? 0 : Math.round((index / (total - 1)) * (palette.length - 1));
  return palette[Math.min(idx, palette.length - 1)];
}

/* ---------------- PAGE ---------------- */

export default function SubjectLandingPage() {
  const params = useParams();
  const router = useRouter();

  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : null;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredModule, setHoveredModule] = useState<number | null>(null);

  /* ---------------- FETCH ---------------- */

  useEffect(() => {
    if (!id) { setError("Invalid subject id"); setLoading(false); return; }

    async function fetchSubject() {
      try {
        const res = await fetch(`/api/dashboard/subjects/${id}`);
        if (!res.ok) { setError(`API error ${res.status}`); return; }
        const data = await res.json();
        setSubject(data.subject);
        setModules(data.modules || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load subject");
      } finally {
        setLoading(false);
      }
    }

    fetchSubject();
  }, [id]);

  /* ---------------- STATES ---------------- */

  if (loading) {
    return (
      <div style={styles.loadingWrapper}>
        <style>{loadingAnimation}</style>
        <div style={styles.loadingDot} />
        <div style={{ ...styles.loadingDot, animationDelay: "0.2s" }} />
        <div style={{ ...styles.loadingDot, animationDelay: "0.4s" }} />
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div style={styles.loadingWrapper}>
        <p style={{ color: "#ff7b00", fontFamily: "'DM Sans', sans-serif" }}>
          {error || "Subject not found"}
        </p>
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div style={styles.page}>
      <style>{globalStyles}</style>

      {/* Background orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div style={styles.container}>

        {/* BACK */}
        <button
          style={styles.backBtn}
          onClick={() => router.push("/dashboard")}
          onMouseEnter={e => (e.currentTarget.style.color = "#ff9500")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >
          ← Back to Dashboard
        </button>

        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.eyebrow}>SUBJECT</div>
            <h1 style={styles.heading}>{subject.title}</h1>
            <div style={styles.metaRow}>
              {subject.exam && (
                <span style={styles.metaChip}>
                  <span style={{ color: "#ff9500" }}>●</span>&nbsp;{subject.exam}
                </span>
              )}
              {subject.total_duration && (
                <span style={styles.metaChip}>
                  <span style={{ color: "#ffb700" }}>◷</span>&nbsp;{subject.total_duration}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* DIVIDER */}
        <div style={styles.divider} />

        {/* ACTION BAR */}
        <div style={styles.actionBar}>
          <ActionButton
            icon="🗺"
            label="Roadmap"
            onClick={() => router.push(`/dashboard/subject/${id}/roadmap`)}
          />
          <ActionButton
            icon="💬"
            label="Chat / History"
            onClick={() => router.push(`/dashboard/subject/${id}/chat`)}
          />
          <ActionButton
            icon="📊"
            label="Progress"
            disabled
            note="coming soon"
          />
        </div>

        {/* MODULES */}
        <section style={styles.modulesSection}>
          <h2 style={styles.sectionTitle}>
            Modules
            <span style={styles.moduleCount}>{modules.length}</span>
          </h2>

          <div style={styles.grid}>
            {modules.map((mod, i) => {
              const accent = getAccent(i, modules.length);
              const isHovered = hoveredModule === mod.module_order;

              return (
                <div
                  key={mod.module_order}
                  style={{ position: "relative" }}
                  className="module-card-wrapper"
                  onMouseEnter={() => setHoveredModule(mod.module_order)}
                  onMouseLeave={() => setHoveredModule(null)}
                  onClick={() =>
                    router.push(`/dashboard/subject/${id}/module/${mod.module_order}`)
                  }
                >
                  {/* BASE CARD */}
                  <div
                    style={{
                      ...styles.card,
                      opacity: isHovered ? 0 : 1,
                      borderColor: isHovered ? `${accent}55` : "rgba(255,255,255,0.07)",
                    }}
                  >
                    <div style={styles.cardTopLine} />

                    <div style={{ ...styles.moduleNumber, color: accent, borderColor: `${accent}33`, background: `${accent}11` }}>
                      {mod.module_order}
                    </div>

                    <h3 style={styles.cardTitle}>{mod.title}</h3>

                    <p style={styles.cardGoal}>{mod.goal}</p>
                  </div>

                  {/* HOVER OVERLAY */}
                  <div
                    style={{
                      ...styles.cardOverlay,
                      opacity: isHovered ? 1 : 0,
                      borderColor: `${accent}55`,
                      boxShadow: isHovered ? `0 0 32px ${accent}20` : "none",
                      pointerEvents: isHovered ? "auto" : "none",
                    }}
                  >
                    <div style={{ ...styles.overlayHeader, color: accent }}>
                      Topics covered
                    </div>
                    <ul style={styles.topicList}>
                      {mod.topics.map((t, ti) => (
                        <li key={ti} style={styles.topicItem}>
                          <span style={{ color: accent, marginRight: "6px" }}>›</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                    <div style={{ ...styles.openHint, color: accent }}>
                      Click to open →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}

/* ---------------- ACTION BUTTON ---------------- */

function ActionButton({
  icon, label, onClick, disabled, note,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  note?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        ...styles.actionBtn,
        ...(disabled ? styles.actionBtnDisabled : {}),
        ...(hovered && !disabled ? styles.actionBtnHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={styles.actionIcon}>{icon}</span>
      <span>{label}</span>
      {note && <span style={styles.actionNote}>{note}</span>}
    </button>
  );
}

/* ---------------- STYLES ---------------- */

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#fff",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  orb1: {
    position: "fixed",
    top: "-180px",
    right: "-100px",
    width: "520px",
    height: "520px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,136,0,0.12) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  orb2: {
    position: "fixed",
    bottom: "-200px",
    left: "-140px",
    width: "580px",
    height: "580px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,208,0,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "40px 24px 80px",
    position: "relative",
    zIndex: 1,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.3)",
    fontSize: "13px",
    cursor: "pointer",
    padding: "0 0 28px",
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.02em",
    transition: "color 0.2s",
    display: "block",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "24px",
    flexWrap: "wrap",
  },
  headerLeft: {},
  eyebrow: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.18em",
    color: "#ff9500",
    marginBottom: "10px",
    textTransform: "uppercase",
  },
  heading: {
    fontSize: "clamp(26px, 4vw, 40px)",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: 1.15,
    margin: "0 0 14px",
    background: "linear-gradient(135deg, #ffffff 30%, #ffb700 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  metaChip: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.4)",
    background: "rgba(255,255,255,0.05)",
    padding: "5px 12px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  divider: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(255,183,0,0.22), transparent)",
    margin: "36px 0",
  },
  actionBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "48px",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.75)",
    padding: "11px 20px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'DM Sans', sans-serif",
  },
  actionBtnHover: {
    background: "rgba(255,149,0,0.1)",
    borderColor: "rgba(255,149,0,0.4)",
    color: "#ff9500",
  },
  actionBtnDisabled: {
    opacity: 0.35,
    cursor: "not-allowed",
  },
  actionIcon: {
    fontSize: "16px",
  },
  actionNote: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.06)",
    padding: "2px 7px",
    borderRadius: "6px",
    marginLeft: "2px",
  },
  modulesSection: {},
  sectionTitle: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.14em",
    color: "rgba(255,255,255,0.28)",
    textTransform: "uppercase",
    marginBottom: "18px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  moduleCount: {
    fontSize: "11px",
    background: "rgba(255,149,0,0.15)",
    color: "#ff9500",
    padding: "2px 8px",
    borderRadius: "99px",
    fontWeight: 600,
    letterSpacing: "0.04em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "14px",
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "16px",
    padding: "22px 20px",
    cursor: "pointer",
    transition: "opacity 0.2s ease, border-color 0.2s ease",
    minHeight: "160px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    position: "relative",
    overflow: "hidden",
  },
  cardTopLine: {
    position: "absolute",
    top: 0,
    left: "15%",
    width: "70%",
    height: "2px",
    borderRadius: "0 0 4px 4px",
    background: "rgba(255,255,255,0.06)",
  },
  moduleNumber: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    margin: 0,
    lineHeight: 1.35,
    letterSpacing: "-0.01em",
  },
  cardGoal: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.3)",
    margin: 0,
    lineHeight: 1.55,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardOverlay: {
    position: "absolute",
    inset: 0,
    background: "#111",
    border: "1px solid",
    borderRadius: "16px",
    padding: "20px",
    transition: "opacity 0.2s ease, box-shadow 0.2s ease",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    cursor: "pointer",
    overflow: "hidden",
  },
  overlayHeader: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: "2px",
  },
  topicList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  topicItem: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.55)",
    lineHeight: 1.45,
    display: "flex",
    alignItems: "flex-start",
  },
  openHint: {
    fontSize: "12px",
    fontWeight: 600,
    marginTop: "auto",
    paddingTop: "8px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  loadingWrapper: {
    minHeight: "100vh",
    background: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  loadingDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#ff9500",
    animation: "dotPulse 1.2s ease-in-out infinite",
  },
};

const loadingAnimation = `
@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.25; }
  40% { transform: scale(1); opacity: 1; }
}
`;

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }
  .module-card-wrapper { animation: fadeUp 0.4s ease both; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;