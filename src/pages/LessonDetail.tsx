import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Users, CalendarDays, Trash2, Eye, X, Calendar, BookOpen, UserPlus, Check } from 'lucide-react';

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

interface NewStudentForm {
  full_name: string;
  phone: string;
  parent_phone: string;
  grade_class: string;
  notes: string;
}

const emptyForm = (): NewStudentForm => ({ full_name: '', phone: '', parent_phone: '', grade_class: '', notes: '' });

const LessonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [lesson, setLesson] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allEnrolledIds, setAllEnrolledIds] = useState<string[]>([]);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]); // ← متعدد
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [sessionAttendance, setSessionAttendance] = useState<Record<string, { present: number; total: number }>>({});
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState('');
  const [addStudentGradeFilter, setAddStudentGradeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // تاب: existing = من القائمة، new = طالب جديد
  const [addTab, setAddTab] = useState<'existing' | 'new'>('existing');
  const [newStudentForm, setNewStudentForm] = useState<NewStudentForm>(emptyForm());
  const [newStudentSaving, setNewStudentSaving] = useState(false);

  const fetchAll = async () => {
    if (!id || !user) return;
    const [lessonRes, sessionsRes, enrolledRes, allStudentsRes, allEnrolledRes] = await Promise.all([
      supabase.from('lessons').select('*').eq('id', id).single(),
      supabase.from('sessions').select('*').eq('lesson_id', id).order('date', { ascending: false }),
      supabase.from('lesson_students').select('*, students(id, full_name, grade_class)').eq('lesson_id', id),
      supabase.from('students').select('id, full_name, grade_class, phone, parent_phone'),
      supabase.from('lesson_students').select('student_id'),
    ]);
    if (lessonRes.data) setLesson(lessonRes.data);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (enrolledRes.data) setEnrolledStudents(enrolledRes.data);
    if (allStudentsRes.data) setAllStudents(allStudentsRes.data);
    if (allEnrolledRes.data) setAllEnrolledIds(allEnrolledRes.data.map((e: any) => e.student_id));
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

  // ── إضافة طلاب متعددين من القائمة ──
  const addSelectedStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    setSaving(true);
    try {
      const rows = selectedStudentIds.map(sid => ({ lesson_id: id!, student_id: sid }));
      const { error } = await supabase.from('lesson_students').insert(rows);
      if (error) throw error;
      toast({ title: `تم إضافة ${selectedStudentIds.length} طالب بنجاح ✅` });
      closeAddDialog();
      fetchAll();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── إضافة طالب جديد تلقائياً ──
  const addNewStudent = async () => {
    if (!newStudentForm.full_name.trim()) return;
    setNewStudentSaving(true);
    try {
      // 1) أضف الطالب في جدول students
      const { data: created, error: createErr } = await supabase
        .from('students')
        .insert({
          user_id: user!.id,
          full_name: newStudentForm.full_name.trim(),
          phone: newStudentForm.phone.trim() || null,
          parent_phone: newStudentForm.parent_phone.trim() || null,
          grade_class: newStudentForm.grade_class || null,
          notes: newStudentForm.notes.trim() || null,
        })
        .select()
        .single();
      if (createErr) throw createErr;

      // 2) سجّله في المجموعة مباشرة
      const { error: enrollErr } = await supabase
        .from('lesson_students')
        .insert({ lesson_id: id!, student_id: created.id });
      if (enrollErr) throw enrollErr;

      toast({ title: `تم إضافة ${created.full_name} وتسجيله في المجموعة ✅` });
      closeAddDialog();
      fetchAll();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setNewStudentSaving(false);
    }
  };

  const closeAddDialog = () => {
    setAddStudentOpen(false);
    setSelectedStudentIds([]);
    setAddStudentGradeFilter('');
    setSearchQuery('');
    setAddTab('existing');
    setNewStudentForm(emptyForm());
  };

  const toggleSelect = (sid: string) =>
    setSelectedStudentIds(prev =>
      prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]
    );

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

  const availableStudents = allStudents.filter(s => !allEnrolledIds.includes(s.id));

  const enrolledGrades = [...new Set(enrolledStudents.map(e => e.students?.grade_class).filter(Boolean))] as string[];
  const filteredEnrolled = gradeFilter
    ? enrolledStudents.filter(e => e.students?.grade_class === gradeFilter)
    : enrolledStudents;

  const filteredAvailable = availableStudents
    .filter(s => !addStudentGradeFilter || s.grade_class === addStudentGradeFilter)
    .filter(s => !searchQuery || s.full_name.includes(searchQuery));

  const avatarColors = [
    { bg: '#1e3a5f', text: '#60a5fa' }, { bg: '#1a3d2b', text: '#4ade80' },
    { bg: '#2d1f4e', text: '#a78bfa' }, { bg: '#3d2a0a', text: '#fbbf24' },
    { bg: '#3d1a2e', text: '#f472b6' }, { bg: '#1a2d3d', text: '#38bdf8' },
  ];

  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer', appearance: 'none' as any,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'left 12px center', paddingLeft: 32,
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
        .student-item:hover { background: rgba(56,189,248,0.06) !important; }
        .student-item.selected { background: rgba(56,189,248,0.1) !important; border-color: rgba(56,189,248,0.4) !important; }
        .add-tab { padding: 7px 16px; border-radius: 8px; border: none; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 600; transition: all 0.15s; }
        .add-tab.active { background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); }
        .add-tab.inactive { background: transparent; color: #64748b; border: 1px solid rgba(255,255,255,0.07); }
        .add-tab.active-purple { background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
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
              <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} style={{ background: gradeFilter ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.04)', border: gradeFilter ? '1px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: gradeFilter ? '#38bdf8' : '#64748b', cursor: 'pointer', fontFamily: 'inherit', outline: 'none', appearance: 'none' as any, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 8px center', paddingLeft: 24 }}>
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
              <Plus size={13} /> إضافة طلاب
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

      {/* ════════════════════════════════════════
          داياولوج إضافة الطلاب (متعدد + جديد)
      ════════════════════════════════════════ */}
      {addStudentOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => e.target === e.currentTarget && closeAddDialog()}
        >
          <div style={{ background: '#0f0f17', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '22px 20px', width: '100%', maxWidth: 440, direction: 'rtl', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

            {/* رأس الداياولوج */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>إضافة طلاب للمجموعة</h2>
              <button onClick={closeAddDialog} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={15} />
              </button>
            </div>

            {/* تابات */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button className={`add-tab ${addTab === 'existing' ? 'active' : 'inactive'}`} onClick={() => setAddTab('existing')}>
                <Users size={12} style={{ display: 'inline', marginLeft: 4 }} />
                من قائمة الطلاب
              </button>
              <button className={`add-tab ${addTab === 'new' ? 'active-purple active' : 'inactive'}`} onClick={() => setAddTab('new')}>
                <UserPlus size={12} style={{ display: 'inline', marginLeft: 4 }} />
                طالب جديد
              </button>
            </div>

            {/* ── تاب: من القائمة ── */}
            {addTab === 'existing' && (
              <>
                {/* فلاتر */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    type="text"
                    placeholder="ابحث باسم الطالب..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(56,189,248,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                  />
                  <select
                    value={addStudentGradeFilter}
                    onChange={e => setAddStudentGradeFilter(e.target.value)}
                    style={{ ...selectStyle, width: 'auto', minWidth: 130 }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
                  >
                    <option value="" style={{ background: '#0f0f17' }}>كل الصفوف</option>
                    {GRADES.map(group => (
                      <optgroup key={group.group} label={group.group} style={{ background: '#0f0f17', color: '#475569' }}>
                        {group.items.map(g => (
                          <option key={g} value={g} style={{ background: '#0f0f17', color: '#e2e8f0' }}>{g}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* عداد المختارين */}
                {selectedStudentIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 10, padding: '8px 14px', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>
                      تم اختيار {selectedStudentIds.length} طالب
                    </span>
                    <button onClick={() => setSelectedStudentIds([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 11, fontFamily: 'inherit' }}>
                      إلغاء الكل
                    </button>
                  </div>
                )}

                {/* قائمة الطلاب */}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', maxHeight: 280 }}>
                  {filteredAvailable.length === 0 ? (
                    <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: '#334155' }}>
                      {availableStudents.length === 0 ? 'كل الطلاب مسجلين بالفعل في مجموعات' : 'لا توجد نتائج'}
                    </div>
                  ) : (
                    filteredAvailable.map(s => {
                      const selected = selectedStudentIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          className={`student-item${selected ? ' selected' : ''}`}
                          onClick={() => toggleSelect(s.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            transition: 'background 0.12s',
                            background: selected ? 'rgba(56,189,248,0.08)' : 'transparent',
                          }}
                        >
                          {/* checkbox مرئي */}
                          <div style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                            border: selected ? '2px solid #38bdf8' : '2px solid rgba(255,255,255,0.15)',
                            background: selected ? 'rgba(56,189,248,0.2)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.12s',
                          }}>
                            {selected && <Check size={12} color="#38bdf8" />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{s.full_name}</div>
                            {s.grade_class && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{s.grade_class}</div>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* أزرار */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={addSelectedStudents}
                    disabled={selectedStudentIds.length === 0 || saving}
                    style={{ flex: 1, background: selectedStudentIds.length > 0 ? 'rgba(56,189,248,0.15)' : 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, color: selectedStudentIds.length > 0 ? '#38bdf8' : '#334155', cursor: selectedStudentIds.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                  >
                    {saving ? 'جاري الإضافة...' : `إضافة${selectedStudentIds.length > 0 ? ` (${selectedStudentIds.length})` : ''}`}
                  </button>
                  <button onClick={closeAddDialog} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 20px', fontSize: 13, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
                    إلغاء
                  </button>
                </div>
              </>
            )}

            {/* ── تاب: طالب جديد ── */}
            {addTab === 'new' && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  {/* الاسم */}
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>الاسم الكامل <span style={{ color: '#f87171' }}>*</span></label>
                    <input
                      type="text"
                      placeholder="اسم الطالب..."
                      value={newStudentForm.full_name}
                      onChange={e => setNewStudentForm(p => ({ ...p, full_name: e.target.value }))}
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'rgba(167,139,250,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                    />
                  </div>

                  {/* الصف */}
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>الصف الدراسي</label>
                    <select
                      value={newStudentForm.grade_class}
                      onChange={e => setNewStudentForm(p => ({ ...p, grade_class: e.target.value }))}
                      style={selectStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
                    >
                      <option value="" style={{ background: '#0f0f17' }}>اختر الصف (اختياري)</option>
                      {GRADES.map(group => (
                        <optgroup key={group.group} label={group.group} style={{ background: '#0f0f17', color: '#475569' }}>
                          {group.items.map(g => (
                            <option key={g} value={g} style={{ background: '#0f0f17', color: '#e2e8f0' }}>{g}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* رقم ولي الأمر */}
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>رقم ولي الأمر</label>
                    <input
                      type="tel"
                      placeholder="01xxxxxxxxx"
                      value={newStudentForm.parent_phone}
                      onChange={e => setNewStudentForm(p => ({ ...p, parent_phone: e.target.value }))}
                      style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(167,139,250,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                    />
                  </div>

                  {/* رقم الطالب */}
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>رقم الطالب</label>
                    <input
                      type="tel"
                      placeholder="01xxxxxxxxx"
                      value={newStudentForm.phone}
                      onChange={e => setNewStudentForm(p => ({ ...p, phone: e.target.value }))}
                      style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(167,139,250,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                    />
                  </div>

                  {/* ملاحظات */}
                  <div>
                    <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>ملاحظات</label>
                    <textarea
                      placeholder="أي ملاحظات إضافية..."
                      value={newStudentForm.notes}
                      onChange={e => setNewStudentForm(p => ({ ...p, notes: e.target.value }))}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(167,139,250,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                    />
                  </div>
                </div>

                {/* أزرار */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={addNewStudent}
                    disabled={!newStudentForm.full_name.trim() || newStudentSaving}
                    style={{ flex: 1, background: newStudentForm.full_name.trim() ? 'rgba(167,139,250,0.15)' : 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, color: newStudentForm.full_name.trim() ? '#a78bfa' : '#334155', cursor: newStudentForm.full_name.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                  >
                    {newStudentSaving ? 'جاري الحفظ...' : 'إضافة وتسجيل في المجموعة'}
                  </button>
                  <button onClick={closeAddDialog} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 20px', fontSize: 13, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
                    إلغاء
                  </button>
                </div>
              </>
            )}
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
