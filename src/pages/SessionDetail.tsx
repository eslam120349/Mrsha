import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface StudentRecord {
  student_id: string;
  full_name: string;
  attendance_status: 'present' | 'absent';
  homework_score: string;
  homework_max: number;
  homework_status: 'completed' | 'not_completed';
  feedback_comment: string;
}

const SessionDetail = () => {
  const { id: lessonId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lessonId || !sessionId) return;
    const fetchData = async () => {
      const [sessionRes, lessonRes] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', sessionId).single(),
        supabase.from('lessons').select('*').eq('id', lessonId).single(),
      ]);
      if (sessionRes.data) setSession(sessionRes.data);
      if (lessonRes.data) setLesson(lessonRes.data);

      const { data: enrolled } = await supabase
        .from('lesson_students').select('student_id, students(id, full_name)').eq('lesson_id', lessonId!);
      if (!enrolled?.length) return;

      const [attRes, hwRes, fbRes] = await Promise.all([
        supabase.from('attendance').select('*').eq('session_id', sessionId!),
        supabase.from('homework').select('*').eq('session_id', sessionId!),
        supabase.from('feedback').select('*').eq('session_id', sessionId!),
      ]);
      const attMap = new Map((attRes.data || []).map(a => [a.student_id, a]));
      const hwMap  = new Map((hwRes.data  || []).map(h => [h.student_id, h]));
      const fbMap  = new Map((fbRes.data  || []).map(f => [f.student_id, f]));

      setRecords(enrolled.map((e: any) => ({
        student_id: e.student_id,
        full_name: e.students?.full_name || '',
        attendance_status: attMap.get(e.student_id)?.status || 'absent',
        homework_score: hwMap.get(e.student_id)?.score?.toString() || '',
        homework_max: hwMap.get(e.student_id)?.max_score || 10,
        homework_status: hwMap.get(e.student_id)?.status || 'not_completed',
        feedback_comment: fbMap.get(e.student_id)?.comment || '',
      })));
    };
    fetchData();
  }, [lessonId, sessionId]);

  const updateRecord = (studentId: string, field: keyof StudentRecord, value: any) =>
    setRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, [field]: value } : r));

  const saveAll = async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      for (const r of records) {
        await supabase.from('attendance').upsert({ session_id: sessionId, student_id: r.student_id, status: r.attendance_status }, { onConflict: 'session_id,student_id' });
        await supabase.from('homework').upsert({ session_id: sessionId, student_id: r.student_id, score: r.homework_score ? Number(r.homework_score) : null, max_score: r.homework_max, status: r.homework_status }, { onConflict: 'session_id,student_id' });
        if (r.feedback_comment.trim()) {
          await supabase.from('feedback').upsert({ session_id: sessionId, student_id: r.student_id, comment: r.feedback_comment }, { onConflict: 'session_id,student_id' });
        }
      }
      toast({ title: 'تم حفظ جميع البيانات بنجاح ✅' });
    } catch (error: any) {
      toast({ title: 'حدث خطأ أثناء الحفظ', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!session || !lesson) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#475569', fontFamily: "'Cairo', sans-serif" }}>
      جاري التحميل...
    </div>
  );

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif" }}>
      <style>{`
        .ssd-scroll-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .ssd-scroll-wrap::-webkit-scrollbar { height: 5px; }
        .ssd-scroll-wrap::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 3px; }
        .ssd-scroll-wrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        .ssd-table { min-width: 720px; width: 100%; border-collapse: collapse; }
        .ssd-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        @media (max-width: 639px) {
          .ssd-save-btn { width: 100%; justify-content: center; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to={`/lessons/${lessonId}`} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', textDecoration: 'none', flexShrink: 0 }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{lesson.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, color: '#64748b', fontSize: 13 }}>
            <CalendarDays size={14} />
            <span>{session.date}</span>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button onClick={saveAll} disabled={saving} size="lg" className={`gap-2 px-8 ssd-save-btn`}>
          <Save size={18} />
          {saving ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
        </Button>
      </div>

      {records.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          لا يوجد طلاب مسجلين في هذا الدرس
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
          <div className="ssd-scroll-wrap">
            <table className="ssd-table">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.035)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {[
                    { label: 'اسم الطالب', w: '26%' },
                    { label: 'الحضور',     w: '16%' },
                    { label: 'الواجب',     w: '16%' },
                    { label: 'الحالة',     w: '14%' },
                    { label: 'ملاحظات',    w: '28%' },
                  ].map((h, i) => (
                    <th key={i} style={{ padding: '14px 16px', textAlign: i === 0 || i === 4 ? 'right' : 'center', fontSize: 13, fontWeight: 600, color: '#94a3b8', width: h.w }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, index) => (
                  <tr key={r.student_id}
                    style={{ borderBottom: index === records.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)', transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '16px', fontWeight: 500, color: '#e2e8f0', fontSize: 14, whiteSpace: 'nowrap' }}>{r.full_name}</td>

                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Switch
                          checked={r.attendance_status === 'present'}
                          onCheckedChange={checked => updateRecord(r.student_id, 'attendance_status', checked ? 'present' : 'absent')}
                          style={{ backgroundColor: r.attendance_status === 'present' ? '#10b981' : '#3f3f46' } as React.CSSProperties}
                        />
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: r.attendance_status === 'present' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: r.attendance_status === 'present' ? '#34d399' : '#f87171' }}>
                          {r.attendance_status === 'present' ? 'حاضر' : 'غائب'}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Input type="number" value={r.homework_score} onChange={e => updateRecord(r.student_id, 'homework_score', e.target.value)} min={0} max={r.homework_max}
                          className="w-20 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0' }} />
                        <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>/ {r.homework_max}</span>
                      </div>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <Button variant={r.homework_status === 'completed' ? 'default' : 'outline'} size="sm"
                        onClick={() => updateRecord(r.student_id, 'homework_status', r.homework_status === 'completed' ? 'not_completed' : 'completed')}
                        style={r.homework_status !== 'completed' ? { backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', color: '#e2e8f0' } : {}}>
                        {r.homework_status === 'completed' ? '✓ مكتمل' : 'غير مكتمل'}
                      </Button>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <Textarea value={r.feedback_comment} onChange={e => updateRecord(r.student_id, 'feedback_comment', e.target.value)}
                        placeholder="اكتب ملاحظة عن الطالب..." rows={2}
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', resize: 'vertical', width: '100%' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionDetail;