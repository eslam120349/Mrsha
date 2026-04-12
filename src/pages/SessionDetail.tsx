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
        .from('lesson_students')
        .select('student_id, students(id, full_name)')
        .eq('lesson_id', lessonId!);

      if (!enrolled?.length) return;

      const [attRes, hwRes, fbRes] = await Promise.all([
        supabase.from('attendance').select('*').eq('session_id', sessionId!),
        supabase.from('homework').select('*').eq('session_id', sessionId!),
        supabase.from('feedback').select('*').eq('session_id', sessionId!),
      ]);

      const attMap = new Map((attRes.data || []).map(a => [a.student_id, a]));
      const hwMap = new Map((hwRes.data || []).map(h => [h.student_id, h]));
      const fbMap = new Map((fbRes.data || []).map(f => [f.student_id, f]));

      const studentRecords: StudentRecord[] = enrolled.map((e: any) => ({
        student_id: e.student_id,
        full_name: e.students?.full_name || '',
        attendance_status: attMap.get(e.student_id)?.status || 'absent',
        homework_score: hwMap.get(e.student_id)?.score?.toString() || '',
        homework_max: hwMap.get(e.student_id)?.max_score || 10,
        homework_status: hwMap.get(e.student_id)?.status || 'not_completed',
        feedback_comment: fbMap.get(e.student_id)?.comment || '',
      }));

      setRecords(studentRecords);
    };

    fetchData();
  }, [lessonId, sessionId]);

  const updateRecord = (studentId: string, field: keyof StudentRecord, value: any) => {
    setRecords(prev =>
      prev.map(r => r.student_id === studentId ? { ...r, [field]: value } : r)
    );
  };

  const saveAll = async () => {
    if (!sessionId) return;
    setSaving(true);

    try {
      const attendanceData = records.map(r => ({
        session_id: sessionId,
        student_id: r.student_id,
        status: r.attendance_status,
      }));
      for (const a of attendanceData) {
        await supabase.from('attendance').upsert(a, { onConflict: 'session_id,student_id' });
      }

      const homeworkData = records.map(r => ({
        session_id: sessionId,
        student_id: r.student_id,
        score: r.homework_score ? Number(r.homework_score) : null,
        max_score: r.homework_max,
        status: r.homework_status,
      }));
      for (const h of homeworkData) {
        await supabase.from('homework').upsert(h, { onConflict: 'session_id,student_id' });
      }

      for (const r of records) {
        if (r.feedback_comment.trim()) {
          await supabase.from('feedback').upsert({
            session_id: sessionId,
            student_id: r.student_id,
            comment: r.feedback_comment,
          }, { onConflict: 'session_id,student_id' });
        }
      }

      toast({ title: 'تم حفظ جميع البيانات بنجاح ✅' });
    } catch (error: any) {
      toast({ 
        title: 'حدث خطأ أثناء الحفظ', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (!session || !lesson) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: 200, 
        color: '#475569',
        fontFamily: "'Cairo', sans-serif" 
      }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif" }} className="space-y-8">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link 
          to={`/lessons/${lessonId}`} 
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#64748b'
          }}
        >
          <ArrowLeft size={18} />
        </Link>

        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            {lesson.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, color: '#64748b', fontSize: 14 }}>
            <CalendarDays size={16} />
            <span>{session.date}</span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={saveAll} disabled={saving} size="lg" className="gap-2 px-8">
          <Save size={18} />
          {saving ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
        </Button>
      </div>

      {records.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '60px 20px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          لا يوجد طلاب مسجلين في هذا الدرس
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            {/* Table Header */}
            <thead>
              <tr style={{
                background: 'rgba(255,255,255,0.035)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'right', 
                  fontSize: '13.5px', 
                  fontWeight: 600, 
                  color: '#94a3b8',
                  width: '28%'
                }}>
                  اسم الطالب
                </th>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'center', 
                  fontSize: '13.5px', 
                  fontWeight: 600, 
                  color: '#94a3b8',
                  width: '12%'
                }}>
                  الحضور
                </th>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'center', 
                  fontSize: '13.5px', 
                  fontWeight: 600, 
                  color: '#94a3b8',
                  width: '14%'
                }}>
                  الواجب
                </th>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'center', 
                  fontSize: '13.5px', 
                  fontWeight: 600, 
                  color: '#94a3b8',
                  width: '12%'
                }}>
                  الحالة
                </th>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'right', 
                  fontSize: '13.5px', 
                  fontWeight: 600, 
                  color: '#94a3b8',
                  width: '34%'
                }}>
                  ملاحظات
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {records.map((r, index) => (
                <tr
                  key={r.student_id}
                  style={{
                    borderBottom: index === records.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* اسم الطالب */}
                  <td style={{ padding: '18px 20px', fontWeight: 500, color: '#e2e8f0', fontSize: 15 }}>
                    {r.full_name}
                  </td>

                  {/* الحضور */}
                  <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <Switch
                        checked={r.attendance_status === 'present'}
                        onCheckedChange={(checked) =>
                          updateRecord(r.student_id, 'attendance_status', checked ? 'present' : 'absent')
                        }
                        className="rtl-switch"
                        style={{
                          backgroundColor: r.attendance_status === 'present' ? '#10b981' : '#3f3f46',
                        } as React.CSSProperties}
                      />
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        padding: '5px 14px',
                        borderRadius: 999,
                        background: r.attendance_status === 'present' 
                          ? 'rgba(16,185,129,0.15)' 
                          : 'rgba(239,68,68,0.15)',
                        color: r.attendance_status === 'present' ? '#34d399' : '#f87171',
                      }}>
                        {r.attendance_status === 'present' ? 'حاضر' : 'غائب'}
                      </span>
                    </div>
                  </td>

                  {/* الواجب */}
                  <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Input
                        type="number"
                        value={r.homework_score}
                        onChange={(e) => updateRecord(r.student_id, 'homework_score', e.target.value)}
                        className="w-24 text-center"
                        min={0}
                        max={r.homework_max}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#e2e8f0',
                        }}
                      />
                      <span style={{ color: '#64748b' }}>/ {r.homework_max}</span>
                    </div>
                  </td>

                  {/* حالة الواجب */}
                  <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                    <Button
                      variant={r.homework_status === 'completed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        updateRecord(r.student_id, 'homework_status', r.homework_status === 'completed' ? 'not_completed' : 'completed')
                      }
                      style={r.homework_status !== 'completed' ? {
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: '#e2e8f0',
                      } : {}}
                    >
                      {r.homework_status === 'completed' ? '✓ مكتمل' : 'غير مكتمل'}
                    </Button>
                  </td>

                  {/* الملاحظات */}
                  <td style={{ padding: '18px 20px' }}>
                    <Textarea
                      value={r.feedback_comment}
                      onChange={(e) => updateRecord(r.student_id, 'feedback_comment', e.target.value)}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SessionDetail;