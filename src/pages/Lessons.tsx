import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, BookOpen, ChevronLeft, X, Calendar } from 'lucide-react';

const DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const DAY_COLORS = [
  { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', text: '#818cf8' },
  { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', text: '#34d399' },
  { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#fbbf24' },
  { bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.25)', text: '#f472b6' },
  { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.25)', text: '#38bdf8' },
  { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', text: '#a78bfa' },
  { bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.25)', text: '#fb923c' },
];

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  day_of_week: string | null;
}

const emptyForm = { title: '', description: '', day_of_week: '' };

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  color: '#e2e8f0',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box' as const,
};

const Lessons = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchLessons = async () => {
    const { data } = await supabase.from('lessons').select('*').order('created_at', { ascending: false });
    if (data) setLessons(data);
  };

  useEffect(() => { if (user) fetchLessons(); }, [user]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('lessons').update({
          title: form.title,
          description: form.description || null,
          day_of_week: form.day_of_week || null,
        }).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'تم تحديث الدرس بنجاح' });
      } else {
        const { error } = await supabase.from('lessons').insert({
          title: form.title,
          description: form.description || null,
          day_of_week: form.day_of_week || null,
          user_id: user!.id,
        });
        if (error) throw error;
        toast({ title: 'تم إضافة الدرس بنجاح' });
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchLessons();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingId(lesson.id);
    setForm({
      title: lesson.title,
      description: lesson.description || '',
      day_of_week: lesson.day_of_week || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم حذف الدرس' });
      setDeleteConfirmId(null);
      fetchLessons();
    }
  };

  const getDayColor = (day: string | null) => {
    if (!day) return DAY_COLORS[0];
    return DAY_COLORS[DAYS.indexOf(day) % DAY_COLORS.length] || DAY_COLORS[0];
  };

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo','Noto Sans Arabic',sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>الدروس</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>{lessons.length} درس مسجل</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: 10, padding: '9px 18px',
            fontSize: 13, fontWeight: 600, color: '#818cf8',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
        >
          <Plus size={16} />
          إضافة درس
        </button>
      </div>

      {/* Empty state */}
      {lessons.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '60px 20px',
          textAlign: 'center',
        }}>
          <BookOpen size={40} style={{ color: '#1e293b', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: '#334155', fontSize: 14 }}>لا يوجد دروس بعد. أضف أول درس!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {lessons.map((lesson) => {
            const dayColor = getDayColor(lesson.day_of_week);
            return (
              <div
                key={lesson.id}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  transition: 'border-color 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Card top accent */}
                <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${dayColor.text}, transparent)`, opacity: 0.6 }} />

                <div style={{ padding: '18px 18px 14px', flex: 1 }}>
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0, marginTop: 1,
                        background: dayColor.bg, border: `1px solid ${dayColor.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <BookOpen size={16} color={dayColor.text} />
                      </div>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', margin: 0, lineHeight: 1.4 }}>
                        {lesson.title}
                      </h3>
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => handleEdit(lesson)} style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#a78bfa', cursor: 'pointer',
                      }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirmId(lesson.id)} style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#f87171', cursor: 'pointer',
                      }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Day badge */}
                  {lesson.day_of_week && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <Calendar size={11} color={dayColor.text} />
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: dayColor.text,
                        background: dayColor.bg,
                        border: `1px solid ${dayColor.border}`,
                        borderRadius: 20, padding: '2px 10px',
                      }}>
                        {lesson.day_of_week}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {lesson.description && (
                    <p style={{
                      fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
                    }}>
                      {lesson.description}
                    </p>
                  )}
                </div>

                {/* Footer link */}
                <Link
                  to={`/lessons/${lesson.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 18px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.01)',
                    fontSize: 12, color: '#475569',
                    textDecoration: 'none',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(99,102,241,0.08)';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#818cf8';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.01)';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#475569';
                  }}
                >
                  <span>عرض التفاصيل والحصص</span>
                  <ChevronLeft size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={e => e.target === e.currentTarget && setDialogOpen(false)}>
          <div style={{
            background: '#0f0f17',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 18, padding: '28px',
            width: '100%', maxWidth: 420, direction: 'rtl',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                {editingId ? 'تعديل الدرس' : 'إضافة درس جديد'}
              </h2>
              <button onClick={() => setDialogOpen(false)} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#64748b',
              }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                placeholder="عنوان الدرس *"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
              />

              {/* Custom day select */}
              <div style={{ position: 'relative' }}>
                <select
                  value={form.day_of_week}
                  onChange={e => setForm({ ...form, day_of_week: e.target.value })}
                  style={{ ...inputStyle, appearance: 'none', paddingLeft: 36, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                >
                  <option value="" style={{ background: '#0f0f17' }}>يوم الحصة</option>
                  {DAYS.map(d => (
                    <option key={d} value={d} style={{ background: '#0f0f17' }}>{d}</option>
                  ))}
                </select>
                <Calendar size={14} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#475569', pointerEvents: 'none',
                }} />
              </div>

              <textarea
                placeholder="وصف الدرس"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={handleSave}
                disabled={loading || !form.title.trim()}
                style={{
                  background: loading || !form.title.trim() ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.2)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  borderRadius: 10, padding: '9px 24px',
                  fontSize: 13, fontWeight: 600,
                  color: loading || !form.title.trim() ? '#4b5563' : '#818cf8',
                  cursor: loading || !form.title.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={() => setDialogOpen(false)}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '9px 20px',
                  fontSize: 13, color: '#64748b',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={e => e.target === e.currentTarget && setDeleteConfirmId(null)}>
          <div style={{
            background: '#0f0f17',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 18, padding: '28px',
            width: '100%', maxWidth: 340,
            direction: 'rtl', textAlign: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Trash2 size={20} color="#f87171" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>حذف الدرس</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 22px' }}>هل أنت متأكد؟ سيتم حذف الدرس وكل بياناته.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                style={{
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10, padding: '9px 22px',
                  fontSize: 13, fontWeight: 600, color: '#f87171',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                نعم، احذف
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '9px 20px',
                  fontSize: 13, color: '#64748b',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lessons;