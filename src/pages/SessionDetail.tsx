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
  parent_phone: string;
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
        .from('lesson_students')
        .select('student_id, students(id, full_name, parent_phone)')
        .eq('lesson_id', lessonId!);
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
        parent_phone: e.students?.parent_phone || '',
      })));
    };
    fetchData();
  }, [lessonId, sessionId]);

  const updateRecord = (studentId: string, field: keyof StudentRecord, value: any) =>
    setRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, [field]: value } : r));

  const openWhatsApp = (r: StudentRecord) => {
    if (!r.parent_phone) {
      toast({ title: 'لا يوجد رقم ولي أمر لهذا الطالب', variant: 'destructive' });
      return;
    }

    let phone = r.parent_phone.replace(/\s+/g, '').replace(/^\+/, '');
    if (phone.startsWith('0')) phone = '2' + phone;

    const hasFeedback = r.feedback_comment.trim().length > 0;
    let msg = '';

    const parentPortalUrl = `https://sh-2otb.vercel.app/student/${r.student_id}`;

    if (r.attendance_status === 'present') {
      msg =
        `ولي أمر الطالب ${r.full_name}، قد حصل ${r.full_name} على ${r.homework_score || '—'} من ${r.homework_max}` +
        ` وقد حضر الحصة ${session.date}` +
        (hasFeedback ? ` وتعليقي على الحصة: ${r.feedback_comment}` : '') +
        `\n\nلمتابعة التقرير الشامل للطالب، يرجى الدخول إلى الرابط التالي:\n${parentPortalUrl}\n\nتحيات مستر شعبان قطب`;
    } else if (r.attendance_status === 'absent') {
      msg =
        `ولى الأمر ${r.full_name} الطالب ${r.full_name} لم يحضر الحصه يوم ` +
        `  ${session.date}` +
        (hasFeedback ? ` وتعليقي على الغياب: ${r.feedback_comment}` : '') +
        `\n\nلمتابعة التقرير الشامل للطالب، يرجى الدخول إلى الرابط التالي:\n${parentPortalUrl}\n\nتحيات مستر شعبان قطب`;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const saveAll = async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      for (const r of records) {
        await supabase.from('attendance').upsert(
          { session_id: sessionId, student_id: r.student_id, status: r.attendance_status },
          { onConflict: 'session_id,student_id' }
        );
        await supabase.from('homework').upsert(
          {
            session_id: sessionId,
            student_id: r.student_id,
            score: r.homework_score ? Number(r.homework_score) : null,
            max_score: r.homework_max,
            status: r.homework_status,
          },
          { onConflict: 'session_id,student_id' }
        );
        if (r.feedback_comment.trim()) {
          await supabase.from('feedback').upsert(
            { session_id: sessionId, student_id: r.student_id, comment: r.feedback_comment },
            { onConflict: 'session_id,student_id' }
          );
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
        .ssd-table { min-width: 800px; width: 100%; border-collapse: collapse; }
        @media (max-width: 639px) {
          .ssd-save-btn { width: 100%; justify-content: center; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link
          to={`/lessons/${lessonId}`}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748b', textDecoration: 'none', flexShrink: 0,
          }}
        >
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
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '60px 20px', textAlign: 'center', color: '#64748b',
        }}>
          لا يوجد طلاب مسجلين في هذا الدرس
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
          <div className="ssd-scroll-wrap">
            <table className="ssd-table">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.035)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {[
                    { label: 'اسم الطالب', w: '22%' },
                    { label: 'الحضور',     w: '14%' },
                    { label: 'الامتحان',   w: '18%' },
                    { label: 'الواجب',     w: '12%' },
                    { label: 'ملاحظات',    w: '26%' },
                    { label: 'واتساب',     w: '8%'  },
                  ].map((h, i) => (
                    <th key={i} style={{
                      padding: '14px 16px',
                      textAlign: i === 0 || i === 4 ? 'right' : 'center',
                      fontSize: 13, fontWeight: 600, color: '#94a3b8', width: h.w,
                    }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, index) => (
                  <tr
                    key={r.student_id}
                    style={{
                      borderBottom: index === records.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* اسم الطالب */}
                    <td style={{ padding: '16px', fontWeight: 500, color: '#e2e8f0', fontSize: 14, whiteSpace: 'nowrap' }}>
                      {r.full_name}
                    </td>

                    {/* الحضور */}
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Switch
                          checked={r.attendance_status === 'present'}
                          onCheckedChange={checked =>
                            updateRecord(r.student_id, 'attendance_status', checked ? 'present' : 'absent')
                          }
                          style={{ backgroundColor: r.attendance_status === 'present' ? '#10b981' : '#3f3f46' } as React.CSSProperties}
                        />
                        <span style={{
                          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                          background: r.attendance_status === 'present' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: r.attendance_status === 'present' ? '#34d399' : '#f87171',
                        }}>
                          {r.attendance_status === 'present' ? 'حاضر' : 'غائب'}
                        </span>
                      </div>
                    </td>

                    {/* الامتحان - الدرجة / أعلى درجة قابلة للتعديل */}
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Input
                          type="number"
                          value={r.homework_score}
                          onChange={e => updateRecord(r.student_id, 'homework_score', e.target.value)}
                          min={0}
                          max={r.homework_max}
                          className="w-16 text-center"
                          placeholder="0"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#e2e8f0',
                          }}
                        />
                        <span style={{ color: '#64748b', fontSize: 16, fontWeight: 700 }}>/</span>
                        <Input
                          type="number"
                          value={r.homework_max}
                          onChange={e => updateRecord(r.student_id, 'homework_max', Number(e.target.value))}
                          min={1}
                          className="w-16 text-center"
                          title="أعلى درجة - اضغط للتعديل"
                          style={{
                            backgroundColor: 'rgba(99,102,241,0.1)',
                            border: '1px solid rgba(99,102,241,0.35)',
                            color: '#a5b4fc',
                          }}
                        />
                      </div>
                    </td>

                    {/* الواجب - حالة الإكمال */}
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <Button
                        variant={r.homework_status === 'completed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          updateRecord(r.student_id, 'homework_status', r.homework_status === 'completed' ? 'not_completed' : 'completed')
                        }
                        style={
                          r.homework_status !== 'completed'
                            ? { backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', color: '#e2e8f0' }
                            : {}
                        }
                      >
                        {r.homework_status === 'completed' ? '✓ مكتمل' : 'غير مكتمل'}
                      </Button>
                    </td>

                    {/* ملاحظات */}
                    <td style={{ padding: '16px' }}>
                      <Textarea
                        value={r.feedback_comment}
                        onChange={e => updateRecord(r.student_id, 'feedback_comment', e.target.value)}
                        placeholder="اكتب ملاحظة عن الطالب..."
                        rows={2}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: '#e2e8f0',
                          resize: 'vertical',
                          width: '100%',
                        }}
                      />
                    </td>

                    {/* واتساب */}
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => openWhatsApp(r)}
                        title={r.parent_phone ? `إرسال لـ ${r.parent_phone}` : 'لا يوجد رقم ولي أمر'}
                        style={{
                          background: r.parent_phone
                            ? 'linear-gradient(135deg, #25D366, #128C7E)'
                            : 'rgba(255,255,255,0.06)',
                          border: r.parent_phone ? 'none' : '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 10,
                          width: 38,
                          height: 38,
                          cursor: r.parent_phone ? 'pointer' : 'not-allowed',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: r.parent_phone ? 1 : 0.4,
                          boxShadow: r.parent_phone ? '0 2px 8px rgba(37,211,102,0.35)' : 'none',
                          transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (!r.parent_phone) return;
                          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(37,211,102,0.5)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = r.parent_phone ? '0 2px 8px rgba(37,211,102,0.35)' : 'none';
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={r.parent_phone ? 'white' : '#64748b'}>
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>
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
