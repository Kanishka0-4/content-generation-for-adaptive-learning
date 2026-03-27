"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Subject = {
  id: number;
  title: string;
  exam: string | null;
  total_duration: string | null;
  progress: number;
};

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
      localStorage.clear();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  /* ---------------- FETCH SUBJECTS ---------------- */
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await fetch("/api/dashboard/subjects", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch subjects");
        const data = await res.json();
        setSubjects(data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubjects();
  }, []);

  /* ---------------- LOADING ---------------- */
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

  /* ---------------- UI ---------------- */
  return (
    <div style={styles.page}>
      <style>{globalStyles}</style>

      {/* Background glow orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div style={styles.container}>

        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>STUDY PLANNER</div>
            <h1 style={styles.heading}>Your Dashboard</h1>
            <p style={styles.subheading}>Track progress across all your subjects.</p>
          </div>

          <div style={styles.headerActions}>
            <button
              onClick={() => router.push("/roadmap")}
              style={styles.primaryBtn}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              + New Roadmap
            </button>
            <button
              onClick={handleLogout}
              style={styles.ghostBtn}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,123,0,0.1)";
                e.currentTarget.style.borderColor = "#ff7b00";
                e.currentTarget.style.color = "#ff7b00";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "rgba(255,255,255,0.45)";
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* DIVIDER */}
        <div style={styles.divider} />

        {/* STATS BAR */}
        {subjects.length > 0 && (
          <div style={styles.statsBar}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{subjects.length}</span>
              <span style={styles.statLabel}>Subjects</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={styles.statValue}>
                {subjects.filter(s => s.progress === 100).length}
              </span>
              <span style={styles.statLabel}>Completed</span>
            </div>
            <div style={styles.statDivider} />
           
          </div>
        )}

        {/* EMPTY STATE */}
        {subjects.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📚</div>
            <h2 style={styles.emptyTitle}>No subjects yet</h2>
            <p style={styles.emptyText}>
              Generate your first AI-powered study roadmap to get started.
            </p>
            <button
              onClick={() => router.push("/roadmap")}
              style={styles.primaryBtn}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Generate Roadmap
            </button>
          </div>
        )}

        {/* SUBJECT GRID */}
        {subjects.length > 0 && (
          <section>
            <h2 style={styles.sectionTitle}>Your Subjects</h2>
            <div style={styles.grid}>
              {subjects.map((subj) => {
                const accent = getAccent(subj.progress);
                return (
                  <div
                    key={subj.id}
                    onClick={() => router.push(`/dashboard/subject/${subj.id}`)}
                    style={styles.card}
                    className="subject-card"
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "translateY(-4px)";
                      el.style.borderColor = accent + "55";
                      el.style.boxShadow = `0 8px 40px ${accent}18`;
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "translateY(0)";
                      el.style.borderColor = "rgba(255,255,255,0.07)";
                      el.style.boxShadow = "none";
                    }}
                  >
                    {/* Top accent line */}
                    <div style={{ ...styles.cardTopLine, background: accent }} />

                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{subj.title}</h3>
                      <span style={{ ...styles.openArrow, color: accent }}>→</span>
                    </div>

                    <div style={styles.cardMeta}>
                      {subj.exam && (
                        <span style={styles.metaTag}>
                          <span style={{ color: accent }}>●</span>&nbsp;{subj.exam}
                        </span>
                      )}
                      {subj.total_duration && (
                        <span style={styles.metaTag}>
                          <span style={{ color: accent }}>◷</span>&nbsp;{subj.total_duration}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div style={styles.progressSection}>
                      <div style={styles.progressHeader}>
                        <span style={styles.progressLabel}>Progress</span>
                        <span style={{ ...styles.progressValue, color: accent }}>
                          {subj.progress}%
                        </span>
                      </div>
                      <div style={styles.progressTrack}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${subj.progress}%`,
                            background: `linear-gradient(90deg, #ff7b00, ${accent})`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

/* ---------------- ACCENT COLOR BY PROGRESS ---------------- */
function getAccent(progress: number): string {
  const palette = [
    "#ff7b00","#ff8800","#ff9500","#ffa200",
    "#ffaa00","#ffb700","#ffc300","#ffd000","#ffdd00","#ffea00",
  ];
  const idx = Math.round((progress / 100) * (palette.length - 1));
  return palette[Math.min(idx, palette.length - 1)];
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
    top: "-200px",
    right: "-120px",
    width: "540px",
    height: "540px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,136,0,0.13) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  orb2: {
    position: "fixed",
    bottom: "-220px",
    left: "-160px",
    width: "620px",
    height: "620px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,208,0,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "56px 24px 80px",
    position: "relative",
    zIndex: 1,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "24px",
  },
  eyebrow: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.18em",
    color: "#ff9500",
    marginBottom: "10px",
    textTransform: "uppercase",
  },
  heading: {
    fontSize: "clamp(28px, 5vw, 44px)",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
    margin: 0,
    background: "linear-gradient(135deg, #ffffff 30%, #ffb700 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subheading: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.38)",
    marginTop: "8px",
    fontWeight: 400,
  },
  headerActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexShrink: 0,
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #ff8800, #ffdd00)",
    color: "#0a0a0a",
    border: "none",
    padding: "12px 22px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.2s",
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
  },
  ghostBtn: {
    background: "transparent",
    color: "rgba(255,255,255,0.45)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "12px 20px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  divider: {
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(255,183,0,0.25), transparent)",
    margin: "40px 0",
  },
  statsBar: {
    display: "flex",
    gap: "0",
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "16px",
    padding: "22px 0",
    marginBottom: "48px",
    width: "fit-content",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "0 36px",
  },
  statValue: {
    fontSize: "26px",
    fontWeight: 700,
    background: "linear-gradient(135deg, #ff9500, #ffdd00)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.02em",
  },
  statLabel: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontWeight: 500,
  },
  statDivider: {
    width: "1px",
    background: "rgba(255,255,255,0.07)",
    alignSelf: "stretch",
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.14em",
    color: "rgba(255,255,255,0.28)",
    textTransform: "uppercase",
    marginBottom: "18px",
    margin: "0 0 18px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "18px",
    padding: "28px",
    cursor: "pointer",
    transition: "transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
    position: "relative",
    overflow: "hidden",
  },
  cardTopLine: {
    position: "absolute",
    top: 0,
    left: "12%",
    width: "76%",
    height: "2px",
    borderRadius: "0 0 4px 4px",
    opacity: 0.65,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  cardTitle: {
    fontSize: "17px",
    fontWeight: 600,
    color: "#fff",
    letterSpacing: "-0.01em",
    lineHeight: 1.3,
    margin: 0,
  },
  openArrow: {
    fontSize: "18px",
    opacity: 0.75,
    flexShrink: 0,
    marginLeft: "10px",
  },
  cardMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "22px",
  },
  metaTag: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.38)",
    background: "rgba(255,255,255,0.05)",
    padding: "4px 10px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  progressSection: {},
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  progressLabel: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.28)",
    fontWeight: 500,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
  },
  progressValue: {
    fontSize: "13px",
    fontWeight: 700,
  },
  progressTrack: {
    width: "100%",
    height: "4px",
    background: "rgba(255,255,255,0.07)",
    borderRadius: "99px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: "99px",
    transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
  },
  emptyState: {
    background: "rgba(255,255,255,0.02)",
    border: "1px dashed rgba(255,183,0,0.18)",
    borderRadius: "24px",
    padding: "72px 40px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "14px",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "6px",
  },
  emptyTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#fff",
    margin: 0,
  },
  emptyText: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.38)",
    maxWidth: "360px",
    lineHeight: 1.65,
    margin: 0,
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
  .subject-card {
    animation: fadeUp 0.45s ease both;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;