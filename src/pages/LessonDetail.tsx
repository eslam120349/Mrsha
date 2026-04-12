import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Users, CalendarDays, Trash2, Eye, X, Calendar, BookOpen } from 'lucide-react';

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#e2e8f0',
  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s', boxSizing: 'border-box' as const,
};

const GRADES = [
  { group: 'المرحلة الابتدائية', items: ['الأول الابتدائي','الثاني الابتدائي','الثالث الابتدائي','الرابع الابتدائي','الخامس الابتدائي','السادس الابتدائي'] },
  { group: 'المرحلة الإعدادية', items: ['الأول الإعدادي','الثاني الإعدادي','الثالث الإعدادي'] },
  { group: 'المرحلة الثانوية',  items: ['الأول الثانوي','الثاني الثانوي','الثالث الثانوي'] },
];

const LessonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [lesson, setLesson] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [sessionAttendance, setSessionAttendance] = useState<Record<string, { present: number; total: number }>>({});
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState('');
  const [addStudentGradeFilter, setAddStudentGradeFilter] = useState('');

  const fetchAll = async () => {
    if (!id || !user) return;
    const [lessonRes, sessionsRes, enrolledRes, allStudentsRes] = await Promise.all([
      supabase.from('lessons').select('*').eq('id', id).single(),
      supabase.from('sessions').select('*').eq('lesson_id', id).order('date', { ascending: false }),
      supabase.from('lesson_students').select('*, students(id, full_name, grade_class)').eq('lesson_id', id),
      supabase.from('students').select('id, full_name, grade_class'),
    ]);
    if (lessonRes.data) setLesson(lessonRes.data);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (enrolledRes.data) setEnrolledStudents(enrolledRes.data);
    if (allStudentsRes.data) setAllStudents(allStudentsRes.data);
  };

  useEffect(() => { fetchAll(); }, [id, user]);

  useEffect(() => {
    if (sessions.length === 0) return;
    const fetchAttendance = async () => {
      const sessionIds = sessions.map(s => s.id);
      const { data } = await supabase.from('attendance').select('session_id, status').in('session_id', sessionIds);
      if (data) {
        const map: Record<string, { present: number; total: number }> = {};
        data.forEach(a => {
          if (!map[a.session_id]) map[a.session_id] = { present: 0, total: 0 };
          map[a.session_id].total++;
          if (a.status === 'present') map[a.session_id].present++;
        });
        setSessionAttendance(map);
      }
    };
    fetchAttendance();
  }, [sessions]);

  const addStudent = async () => {
    if (!selectedStudentId) return;
    const { error } = await supabase.from('lesson_students').insert({ lesson_id: id!, student_id: selectedStudentId });
    if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'تم إضافة الطالب' }); setAddStudentOpen(false); setSelectedStudentId(''); setAddStudentGradeFilter(''); fetchAll(); }
  };

  const removeStudent = async (lsId: string) => {
    const { error } = await supabase.from('lesson_students').delete().eq('id', lsId);
    if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'تم إزالة الطالب' }); setRemoveConfirmId(null); fetchAll(); }
  };

  const createSession = async () => {
    if (!newSessionDate) return;
    const { error } = await supabase.from('sessions').insert({ lesson_id: id!, user_id: user!.id, date: newSessionDate });
    if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'تم إنشاء الحصة' }); setNewSessionOpen(false); setNewSessionDate(''); fetchAll(); }
  };

  const enrolledIds = enrolledStudents.map(e => e.student_id);
  const availableStudents = allStudents.filter(s => !enrolledIds.includes(s.id));

  // فلتر الطلاب المسجلين
  const enrolledGrades = [...new Set(
    enrolledStudents.map(e => e.students?.grade_class).filter(Boolean)
  )] as string[];
  const filteredEnrolled = gradeFilter
    ? enrolledStudents.filter(e => e.students?.grade_class === gradeFilter)
    : enrolledStudents;

  // فلتر الطلاب في داياولوج الإضافة
  const filteredAvailable = addStudentGradeFilter
    ? availableStudents.filter(s => s.grade_class === addStudentGradeFilter)
    : availableStudents;

  const avatarColors = [
    { bg: '#1e3a5f', text: '#60a5fa' }, { bg: '#1a3d2b', text: '#4ade80' },
    { bg: '#2d1f4e', text: '#a78bfa' }, { bg: '#3d2a0a', text: '#fbbf24' },
    { bg: '#3d1a2e', text: '#f472b6' }, { bg: '#1a2d3d', text: '#38bdf8' },
  ];

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none' as any,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left 12px center',
    paddingLeft: 32,
  };

  if (!lesson) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#475569', fontFamily: "'Cairo',sans-serif" }}>
      جاري التحميل...
    </div>
  );

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo','Noto Sans Arabic',sans-serif" }}>
      <style>{`
        .ld-scroll-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .ld-scroll-wrap::-webkit-scrollbar { height: 4px; }
        .ld-scroll-wrap::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        .ld-scroll-wrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .ld-sessions-table { min-width: 460px; width: 100%; }
        .ld-session-row { display: grid; grid-template-columns: 1fr 160px 50px; padding: 12px 20px; align-items: center; }
        .ld-session-header { display: grid; grid-template-columns: 1fr 160px 50px; padding: 9px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); background: rgba(255,255,255,0.01); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <Link to="/lessons" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', textDecoration: 'none', flexShrink: 0 }}>
          <ArrowLeft size={17} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={18} color="#818cf8" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{lesson.title}</h1>
            {lesson.day_of_week && (
              <span style={{ fontSize: 11, color: '#818cf8', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '2px 10px', marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={10} /> {lesson.day_of_week}
              </span>
            )}
          </div>
        </div>
      </div>

      {lesson.description && (
        <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
          {lesson.description}
        </div>
      )}

      {/* Enrolled Students */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="#38bdf8" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>الطلاب المسجلين</span>
            <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '2px 10px' }}>
              {filteredEnrolled.length}{gradeFilter ? `/${enrolledStudents.length}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {enrolledGrades.length > 0 && (
              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                style={{
                  background: gradeFilter ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.04)',
                  border: gradeFilter ? '1px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 8, padding: '5px 10px',
                  fontSize: 12, color: gradeFilter ? '#38bdf8' : '#64748b',
                  cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                  appearance: 'none' as any,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'left 8px center',
                  paddingLeft: 24,
                }}
              >
                <option value="" style={{ background: '#0f0f17', color: '#e2e8f0' }}>كل الصفوف</option>
                {GRADES.map(group => (
                  <optgroup key={group.group} label={group.group} style={{ background: '#0f0f17', color: '#475569' }}>
                    {group.items.filter(g => enrolledGrades.includes(g)).map(g => (
                      <option key={g} value={g} style={{ background: '#0f0f17', color: '#e2e8f0' }}>{g}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
            <button onClick={() => setAddStudentOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#38bdf8', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={13} /> إضافة طالب
            </button>
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {filteredEnrolled.length === 0 ? (
            <p style={{ fontSize: 13, color: '#334155', textAlign: 'center', padding: '16px 0' }}>
              {gradeFilter ? `لا يوجد طلاب في ${gradeFilter}` : 'لا يوجد طلاب مسجلين'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {filteredEnrolled.map((e: any, i: number) => {
                const col = avatarColors[i % avatarColors.length];
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 7, background: col.bg, border: `1px solid ${col.text}22`, borderRadius: 20, padding: '5px 10px 5px 6px' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${col.text}22`, color: col.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                      {e.students?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </div>
                    <span style={{ fontSize: 12, color: col.text, fontWeight: 500 }}>{e.students?.full_name}</span>
                    <button onClick={() => setRemoveConfirmId(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: `${col.text}88`, padding: 0, display: 'flex', alignItems: 'center' }}
                      onMouseEnter={ev => (ev.currentTarget.style.color = '#f87171')}
                      onMouseLeave={ev => (ev.currentTarget.style.color = `${col.text}88`)}>
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sessions */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={16} color="#a78bfa" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>الحصص</span>
            <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '2px 10px' }}>{sessions.length}</span>
          </div>
          <button onClick={() => { setNewSessionDate(new Date().toISOString().split('T')[0]); setNewSessionOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#a78bfa', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={13} /> حصة جديدة
          </button>
        </div>
        <div className="ld-scroll-wrap">
          <div className="ld-sessions-table">
            <div className="ld-session-header">
              {['التاريخ', 'الحضور', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 600, color: '#334155', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>
            {sessions.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', fontSize: 13, color: '#334155' }}>لا توجد حصص بعد</div>
            ) : (
              sessions.map((session, i) => {
                const att = sessionAttendance[session.id];
                const pct = att ? Math.round((att.present / att.total) * 100) : null;
                const good = pct !== null && pct >= 75;
                return (
                  <div key={session.id} className="ld-session-row"
                    style={{ borderBottom: i < sessions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CalendarDays size={14} color="#a78bfa" />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{session.date}</span>
                    </div>
                    <div>
                      {att ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: good ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${good ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`, color: good ? '#34d399' : '#fbbf24', whiteSpace: 'nowrap' }}>
                            {att.present}/{att.total} حاضر
                          </span>
                          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: good ? '#10b981' : '#f59e0b', borderRadius: 3 }} />
                          </div>
                        </div>
                      ) : <span style={{ fontSize: 12, color: '#334155' }}>—</span>}
                    </div>
                    <div>
                      <Link to={`/lessons/${id}/sessions/${session.id}`} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', textDecoration: 'none' }}>
                        <Eye size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Student Dialog */}
      {addStudentOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && setAddStudentOpen(false)}>
          <div style={{ background: '#0f0f17', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '24px 20px', width: '100%', maxWidth: 380, direction: 'rtl' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>إضافة طالب للدرس</h2>
              <button onClick={() => { setAddStudentOpen(false); setAddStudentGradeFilter(''); setSelectedStudentId(''); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={15} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* فلتر الصف */}
              <select
                value={addStudentGradeFilter}
                onChange={e => { setAddStudentGradeFilter(e.target.value); setSelectedStudentId(''); }}
                style={selectStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
              >
                <option value="" style={{ background: '#0f0f17' }}>فلتر بالصف (اختياري)</option>
                {GRADES.map(group => (
                  <optgroup key={group.group} label={group.group} style={{ background: '#0f0f17', color: '#475569' }}>
                    {group.items.map(g => (
                      <option key={g} value={g} style={{ background: '#0f0f17', color: '#e2e8f0' }}>{g}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* اختيار الطالب */}
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                style={selectStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
              >
                <option value="" style={{ background: '#0f0f17' }}>
                  {filteredAvailable.length === 0 ? 'لا يوجد طلاب متاحين' : 'اختر طالب'}
                </option>
                {filteredAvailable.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#0f0f17', color: '#e2e8f0' }}>
                    {s.full_name}{s.grade_class ? ` — ${s.grade_class}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={addStudent} disabled={!selectedStudentId} style={{ background: selectedStudentId ? 'rgba(56,189,248,0.15)' : 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 10, padding: '9px 22px', fontSize: 13, fontWeight: 600, color: selectedStudentId ? '#38bdf8' : '#334155', cursor: selectedStudentId ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>إضافة</button>
              <button onClick={() => { setAddStudentOpen(false); setAddStudentGradeFilter(''); setSelectedStudentId(''); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 20px', fontSize: 13, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* New Session Dialog */}
      {newSessionOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && setNewSessionOpen(false)}>
          <div style={{ background: '#0f0f17', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '24px 20px', width: '100%', maxWidth: 360, direction: 'rtl' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>إنشاء حصة جديدة</h2>
              <button onClick={() => setNewSessionOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={15} /></button>
            </div>
            <input type="date" value={newSessionDate} onChange={e => setNewSessionDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={e => (e.target.style.borderColor = 'rgba(167,139,250,0.5)')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={createSession} disabled={!newSessionDate} style={{ background: newSessionDate ? 'rgba(167,139,250,0.15)' : 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10, padding: '9px 22px', fontSize: 13, fontWeight: 600, color: newSessionDate ? '#a78bfa' : '#334155', cursor: newSessionDate ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>إنشاء</button>
              <button onClick={() => setNewSessionOpen(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 20px', fontSize: 13, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Student Confirm */}
      {removeConfirmId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && setRemoveConfirmId(null)}>
          <div style={{ background: '#0f0f17', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 18, padding: '28px', width: '100%', maxWidth: 320, direction: 'rtl', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Trash2 size={18} color="#f87171" /></div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>إزالة الطالب</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 20px' }}>هل تريد إزالة هذا الطالب من الدرس؟</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => removeStudent(removeConfirmId)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 20px', fontSize: 13, fontWeight: 600, color: '#f87171', cursor: 'pointer', fontFamily: 'inherit' }}>نعم، إزالة</button>
              <button onClick={() => setRemoveConfirmId(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 18px', fontSize: 13, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonDetail;