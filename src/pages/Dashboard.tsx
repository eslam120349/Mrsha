import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalLessons: 0,
    totalSessions: 0,
    attendanceRate: 0,
  });
  const [topStudents, setTopStudents] = useState<{ full_name: string; avg: number }[]>([]);
  const [weakStudents, setWeakStudents] = useState<{ full_name: string; avg: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [studentsRes, lessonsRes, sessionsRes, attendanceRes, homeworkRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('lessons').select('id', { count: 'exact', head: true }),
        supabase.from('sessions').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('status'),
        supabase.from('homework').select('student_id, score, max_score, students(full_name)'),
      ]);

      const totalAttendance = attendanceRes.data?.length || 0;
      const presentCount = attendanceRes.data?.filter((a: any) => a.status === 'present').length || 0;
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

      setStats({
        totalStudents: studentsRes.count || 0,
        totalLessons: lessonsRes.count || 0,
        totalSessions: sessionsRes.count || 0,
        attendanceRate,
      });

      if (homeworkRes.data && homeworkRes.data.length > 0) {
        const studentScores: Record<string, { name: string; total: number; max: number; count: number }> = {};
        homeworkRes.data.forEach((hw: any) => {
          if (hw.score != null && hw.students) {
            const sid = hw.student_id;
            if (!studentScores[sid]) {
              studentScores[sid] = { name: hw.students.full_name, total: 0, max: 0, count: 0 };
            }
            studentScores[sid].total += Number(hw.score);
            studentScores[sid].max += Number(hw.max_score);
            studentScores[sid].count += 1;
          }
        });

        const avgList = Object.values(studentScores)
          .map(s => ({
            full_name: s.name,
            avg: s.max > 0 ? Math.round((s.total / s.max) * 100) : 0,
          }))
          .sort((a, b) => b.avg - a.avg);

        setTopStudents(avgList.slice(0, 5));
        setWeakStudents([...avgList].sort((a, b) => a.avg - b.avg).slice(0, 5));
      }
    };
    fetchStats();
  }, [user]);

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '??';

  const avatarColors = [
    { bg: '#1e3a5f', text: '#60a5fa' },
    { bg: '#1a3d2b', text: '#4ade80' },
    { bg: '#2d1f4e', text: '#a78bfa' },
    { bg: '#3d2a0a', text: '#fbbf24' },
    { bg: '#3d1a2e', text: '#f472b6' },
  ];

  const weakColors = [
    { bg: '#3d1a1a', text: '#f87171' },
    { bg: '#3d2a0a', text: '#fb923c' },
    { bg: '#3d1a2e', text: '#f472b6' },
    { bg: '#1a2d3d', text: '#38bdf8' },
    { bg: '#1a3d2b', text: '#34d399' },
  ];

  return (
    <>
      {/* ── Responsive styles injected once ── */}
      <style>{`
        .dash-wrapper {
          min-height: 100vh;
          background: #0a0a0f;
          color: #e2e8f0;
          font-family: 'Cairo', 'Noto Sans Arabic', sans-serif;
          direction: rtl;
          padding: 16px;
          box-sizing: border-box;
        }

        .dash-inner {
          position: relative;
          z-index: 1;
          max-width: 1100px;
          margin: 0 auto;
        }

        /* ── Stat grid: 4 cols desktop → 2×2 mobile ── */
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        /* ── Student panels: side-by-side desktop → stacked mobile ── */
        .students-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 640px) {
          .dash-wrapper {
            padding: 12px;
          }

          .stat-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .students-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            padding: 14px !important;
          }

          .stat-value {
            font-size: 22px !important;
          }

          .stat-icon-box {
            width: 32px !important;
            height: 32px !important;
            margin-bottom: 10px !important;
          }

          .attendance-bar-row {
            flex-direction: row-reverse;
            gap: 10px !important;
          }
        }

        @media (min-width: 641px) and (max-width: 900px) {
          .stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="dash-wrapper">
        {/* Ambient glow */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse at 20% 10%, rgba(99,102,241,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(16,185,129,0.04) 0%, transparent 60%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        <div className="dash-inner">

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>لوحة التحكم</h1>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>الفصل الدراسي الثاني · 2026</p>
            </div>
            <div style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              color: '#818cf8',
              whiteSpace: 'nowrap',
            }}>
              مرحباً بك
            </div>
          </div>

          {/* Stat Cards */}
          <div className="stat-grid">
            {[
              {
                label: 'إجمالي الطلاب',
                value: stats.totalStudents,
                sub: 'طالب مسجل',
                accent: '#6366f1',
                accentBg: 'rgba(99,102,241,0.1)',
                icon: (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/>
                  </svg>
                ),
              },
              {
                label: 'الدروس',
                value: stats.totalLessons,
                sub: 'درس هذا الفصل',
                accent: '#10b981',
                accentBg: 'rgba(16,185,129,0.1)',
                icon: (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                ),
              },
              {
                label: 'الحصص',
                value: stats.totalSessions,
                sub: 'حصة دراسية',
                accent: '#f59e0b',
                accentBg: 'rgba(245,158,11,0.1)',
                icon: (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                ),
              },
              {
                label: 'نسبة الحضور',
                value: `${stats.attendanceRate}%`,
                sub: 'معدل الحضور',
                accent: '#ec4899',
                accentBg: 'rgba(236,72,153,0.1)',
                icon: (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                  </svg>
                ),
              },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: '18px 20px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: 0, right: 20, left: 20, height: 2,
                  background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)`,
                  opacity: 0.6,
                }} />
                <div className="stat-icon-box" style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: s.accentBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{s.label}</div>
                <div className="stat-value" style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 5 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Attendance Progress Bar */}
          <div className="attendance-bar-row" style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '16px 20px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>معدل الحضور الكلي</div>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${stats.attendanceRate}%`,
                background: 'linear-gradient(90deg, #6366f1, #10b981)',
                borderRadius: 4,
                transition: 'width 0.8s ease',
              }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>
              {stats.attendanceRate}%
            </div>
          </div>

          {/* Students Panels */}
          <div className="students-grid">

            {/* Top Students */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
              padding: '20px 22px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>أفضل الطلاب</div>
                <span style={{
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  color: '#34d399',
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 20,
                }}>متفوق</span>
              </div>

              {topStudents.length === 0 ? (
                <p style={{ fontSize: 13, color: '#475569' }}>لا توجد بيانات بعد</p>
              ) : (
                <div>
                  {topStudents.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 0',
                      borderBottom: i < topStudents.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      <span style={{ fontSize: 11, color: '#475569', minWidth: 14, textAlign: 'center' }}>{i + 1}</span>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: avatarColors[i % avatarColors.length].bg,
                        color: avatarColors[i % avatarColors.length].text,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 600, flexShrink: 0,
                      }}>
                        {getInitials(s.full_name)}
                      </div>
                      <span style={{ flex: 1, fontSize: 12, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.full_name}</span>
                      <div style={{ width: 48, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ height: '100%', width: `${s.avg}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#34d399', minWidth: 32, textAlign: 'left' }}>{s.avg}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weak Students */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16,
              padding: '20px 22px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>يحتاجون متابعة</div>
                <span style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171',
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 20,
                }}>يحتاج دعم</span>
              </div>

              {weakStudents.length === 0 ? (
                <p style={{ fontSize: 13, color: '#475569' }}>لا توجد بيانات بعد</p>
              ) : (
                <div>
                  {weakStudents.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 0',
                      borderBottom: i < weakStudents.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      <span style={{ fontSize: 11, color: '#475569', minWidth: 14, textAlign: 'center' }}>{i + 1}</span>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: weakColors[i % weakColors.length].bg,
                        color: weakColors[i % weakColors.length].text,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 600, flexShrink: 0,
                      }}>
                        {getInitials(s.full_name)}
                      </div>
                      <span style={{ flex: 1, fontSize: 12, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.full_name}</span>
                      <div style={{ width: 48, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ height: '100%', width: `${s.avg}%`, background: 'linear-gradient(90deg, #ef4444, #f87171)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#f87171', minWidth: 32, textAlign: 'left' }}>{s.avg}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;