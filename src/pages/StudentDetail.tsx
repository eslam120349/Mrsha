import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, User, Phone, GraduationCap, TrendingUp, CheckCircle, XCircle, BookOpen, MessageSquare } from 'lucide-react';

const StudentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [homeworkHistory, setHomeworkHistory] = useState<any[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [studentRes, attendanceRes, homeworkRes, feedbackRes] = await Promise.all([
        supabase.from('students').select('*').eq('id', id).single(),
        supabase.from('attendance').select('*, sessions(date, lessons(title))').eq('student_id', id).order('created_at', { ascending: false }),
        supabase.from('homework').select('*, sessions(date, lessons(title))').eq('student_id', id).order('created_at', { ascending: false }),
        supabase.from('feedback').select('*, sessions(date, lessons(title))').eq('student_id', id).order('created_at', { ascending: false }),
      ]);
      if (studentRes.data) setStudent(studentRes.data);
      if (attendanceRes.data) setAttendanceHistory(attendanceRes.data);
      if (homeworkRes.data) setHomeworkHistory(homeworkRes.data);
      if (feedbackRes.data) setFeedbackHistory(feedbackRes.data);
    };
    fetchData();
  }, [id]);

  if (!student) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#475569', fontFamily: "'Cairo',sans-serif" }}>
      جاري التحميل...
    </div>
  );

  const totalAttendance = attendanceHistory.length;
  const presentCount = attendanceHistory.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  const scoredHomework = homeworkHistory.filter(h => h.score != null);
  const avgScore = scoredHomework.length > 0
    ? Math.round(scoredHomework.reduce((acc, h) => acc + (h.score / h.max_score) * 100, 0) / scoredHomework.length)
    : 0;

  const initials = student.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '??';

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo','Noto Sans Arabic',sans-serif" }}>
      <style>{`
        .sd-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .sd-scroll-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .sd-scroll-wrap::-webkit-scrollbar { height: 4px; }
        .sd-scroll-wrap::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        .sd-scroll-wrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .sd-table { min-width: 480px; width: 100%; }
        @media (max-width: 639px) {
          .sd-stat-grid { grid-template-columns: repeat(2, 1fr); }
          .sd-back-row { margin-bottom: 16px !important; }
        }
      `}</style>

      {/* Back + title */}
      <div className="sd-back-row" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Link to="/students" style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#64748b', textDecoration: 'none', flexShrink: 0,
        }}>
          <ArrowLeft size={17} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#818cf8', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{student.full_name}</h1>
            {student.grade_class && (
              <span style={{
                fontSize: 11, color: '#818cf8', background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20,
                padding: '2px 10px', marginTop: 4, display: 'inline-block',
              }}>{student.grade_class}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="sd-stat-grid">
        {[
          { icon: <User size={16} color="#818cf8" />, label: 'الصف', value: student.grade_class || '—', bg: 'rgba(99,102,241,0.1)' },
          { icon: <Phone size={16} color="#38bdf8" />, label: 'الهاتف', value: student.phone || '—', bg: 'rgba(56,189,248,0.1)' },
          {
            icon: <TrendingUp size={16} color="#10b981" />, label: 'نسبة الحضور', bg: 'rgba(16,185,129,0.1)',
            value: (
              <div>
                <span style={{ fontSize: 22, fontWeight: 700, color: attendanceRate >= 75 ? '#34d399' : '#f87171' }}>{attendanceRate}%</span>
                <div style={{ marginTop: 4, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${attendanceRate}%`, background: attendanceRate >= 75 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f87171)', borderRadius: 3 }} />
                </div>
              </div>
            ),
          },
          {
            icon: <BookOpen size={16} color="#f59e0b" />, label: 'متوسط الدرجات', bg: 'rgba(245,158,11,0.1)',
            value: (
              <div>
                <span style={{ fontSize: 22, fontWeight: 700, color: avgScore >= 60 ? '#fbbf24' : '#f87171' }}>{avgScore}%</span>
                <div style={{ marginTop: 4, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${avgScore}%`, background: avgScore >= 60 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)', borderRadius: 3 }} />
                </div>
              </div>
            ),
          },
        ].map((c, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{c.label}</div>
            {typeof c.value === 'string' ? <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{c.value}</div> : c.value}
          </div>
        ))}
      </div>

      {student.notes && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#94a3b8' }}>
          <span style={{ color: '#818cf8', fontWeight: 600, marginLeft: 6 }}>ملاحظات:</span>{student.notes}
        </div>
      )}

      {/* Attendance */}
      <Section title="سجل الحضور" icon={<CheckCircle size={16} color="#34d399" />} count={attendanceHistory.length}>
        {attendanceHistory.length === 0 ? <Empty text="لا يوجد سجل حضور" /> : (
          <div className="sd-scroll-wrap">
            <div className="sd-table">
              {attendanceHistory.map((a: any, i: number) => (
                <Row key={a.id} last={i === attendanceHistory.length - 1}
                  title={a.sessions?.lessons?.title || '—'} date={a.sessions?.date}
                  right={
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: 20, background: a.status === 'present' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${a.status === 'present' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color: a.status === 'present' ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' as const }}>
                      {a.status === 'present' ? <><CheckCircle size={11} /> حاضر</> : <><XCircle size={11} /> غائب</>}
                    </span>
                  }
                />
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Homework */}
      <Section title="سجل الواجبات" icon={<BookOpen size={16} color="#fbbf24" />} count={homeworkHistory.length}>
        {homeworkHistory.length === 0 ? <Empty text="لا يوجد سجل واجبات" /> : (
          <div className="sd-scroll-wrap">
            <div className="sd-table">
              {homeworkHistory.map((h: any, i: number) => {
                const pct = h.max_score > 0 ? Math.round((h.score / h.max_score) * 100) : 0;
                return (
                  <Row key={h.id} last={i === homeworkHistory.length - 1}
                    title={h.sessions?.lessons?.title || '—'} date={h.sessions?.date}
                    right={
                      <div style={{ textAlign: 'left', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: pct >= 60 ? '#fbbf24' : '#f87171', whiteSpace: 'nowrap' }}>{h.score ?? '—'} / {h.max_score}</div>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginTop: 3, background: h.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.15)', border: `1px solid ${h.status === 'completed' ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}`, color: h.status === 'completed' ? '#34d399' : '#64748b', whiteSpace: 'nowrap' as const }}>
                          {h.status === 'completed' ? 'مكتمل' : 'غير مكتمل'}
                        </span>
                      </div>
                    }
                  />
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* Feedback */}
      <Section title="سجل الملاحظات" icon={<MessageSquare size={16} color="#a78bfa" />} count={feedbackHistory.length}>
        {feedbackHistory.length === 0 ? <Empty text="لا توجد ملاحظات" /> : (
          <div className="sd-scroll-wrap">
            <div className="sd-table">
              {feedbackHistory.map((f: any, i: number) => (
                <div key={f.id} style={{ padding: '12px 20px', borderBottom: i < feedbackHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{f.sessions?.lessons?.title || '—'}</span>
                    <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>{f.sessions?.date}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{f.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
};

const Section = ({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{title}</span>
      </div>
      <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '2px 10px' }}>{count}</span>
    </div>
    {children}
  </div>
);

const Row = ({ title, date, right, last }: { title: string; date?: string; right: React.ReactNode; last: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)', gap: 16 }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
  >
    <div style={{ flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{title}</div>
      {date && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{date}</div>}
    </div>
    {right}
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: '#334155' }}>{text}</div>
);

export default StudentDetail;