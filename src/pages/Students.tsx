import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Eye, X, GraduationCap } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  grade_class: string | null;
  notes: string | null;
}

const emptyForm = { full_name: '', phone: '', parent_phone: '', grade_class: '', notes: '' };

const avatarColors = [
  { bg: '#1e3a5f', text: '#60a5fa' },
  { bg: '#1a3d2b', text: '#4ade80' },
  { bg: '#2d1f4e', text: '#a78bfa' },
  { bg: '#3d2a0a', text: '#fbbf24' },
  { bg: '#3d1a2e', text: '#f472b6' },
  { bg: '#1a2d3d', text: '#38bdf8' },
  { bg: '#2d3a1a', text: '#86efac' },
];

const getInitials = (name: string) =>
  name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '??';

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

const Students = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false });
    if (data) setStudents(data);
  };

  useEffect(() => { if (user) fetchStudents(); }, [user]);

  const handleSave = async () => {
    if (!form.full_name.trim()) return;
    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('students').update({
          full_name: form.full_name,
          phone: form.phone || null,
          parent_phone: form.parent_phone || null,
          grade_class: form.grade_class || null,
          notes: form.notes || null,
        }).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'تم تحديث الطالب بنجاح' });
      } else {
        const { error } = await supabase.from('students').insert({
          full_name: form.full_name,
          phone: form.phone || null,
          parent_phone: form.parent_phone || null,
          grade_class: form.grade_class || null,
          notes: form.notes || null,
          user_id: user!.id,
        });
        if (error) throw error;
        toast({ title: 'تم إضافة الطالب بنجاح' });
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchStudents();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setForm({
      full_name: student.full_name,
      phone: student.phone || '',
      parent_phone: student.parent_phone || '',
      grade_class: student.grade_class || '',
      notes: student.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم حذف الطالب' });
      setDeleteConfirmId(null);
      fetchStudents();
    }
  };

  const filtered = students.filter(s =>
    s.full_name.includes(search) ||
    s.grade_class?.includes(search) ||
    s.phone?.includes(search)
  );

  return (
    <div style={{ direction: 'rtl', fontFamily: "'Cairo','Noto Sans Arabic',sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>الطلاب</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>{students.length} طالب مسجل</p>
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
          إضافة طالب
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 320, marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
        <input
          placeholder="بحث بالاسم أو الصف..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingRight: 36 }}
          onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
        />
      </div>

      {/* Table card */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 130px 130px 100px 110px',
          padding: '10px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          {['الاسم', 'الهاتف', 'ولي الأمر', 'الصف', 'إجراءات'].map((h, i) => (
            <div key={i} style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <GraduationCap size={36} style={{ color: '#1e293b', margin: '0 auto 12px' }} />
            <p style={{ color: '#334155', fontSize: 14 }}>لا يوجد طلاب</p>
          </div>
        ) : (
          filtered.map((student, idx) => {
            const col = avatarColors[idx % avatarColors.length];
            return (
              <div
                key={student.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 130px 130px 100px 110px',
                  padding: '13px 20px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  alignItems: 'center',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Name + avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: col.bg, color: col.text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {getInitials(student.full_name)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{student.full_name}</span>
                </div>

                <span style={{ fontSize: 12, color: '#64748b' }}>{student.phone || '—'}</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{student.parent_phone || '—'}</span>

                {/* Grade badge */}
                <div>
                  {student.grade_class ? (
                    <span style={{
                      background: 'rgba(99,102,241,0.1)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      color: '#818cf8', fontSize: 11,
                      padding: '3px 10px', borderRadius: 20,
                    }}>
                      {student.grade_class}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#334155' }}>—</span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[
                    { icon: <Eye size={15} />, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)', as: 'link', to: `/students/${student.id}` },
                    { icon: <Pencil size={15} />, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)', onClick: () => handleEdit(student) },
                    { icon: <Trash2 size={15} />, color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', onClick: () => setDeleteConfirmId(student.id) },
                  ].map((btn, bi) =>
                    btn.as === 'link' ? (
                      <Link key={bi} to={btn.to!} style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: btn.bg, border: `1px solid ${btn.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: btn.color, textDecoration: 'none', flexShrink: 0,
                      }}>
                        {btn.icon}
                      </Link>
                    ) : (
                      <button key={bi} onClick={btn.onClick} style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: btn.bg, border: `1px solid ${btn.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: btn.color, cursor: 'pointer', flexShrink: 0,
                      }}>
                        {btn.icon}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={e => e.target === e.currentTarget && setDialogOpen(false)}>
          <div style={{
            background: '#0f0f17',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 18, padding: '28px 28px 24px',
            width: '100%', maxWidth: 440,
            direction: 'rtl',
          }}>
            {/* Dialog header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                {editingId ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
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

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'full_name', placeholder: 'الاسم الكامل *', required: true },
                { key: 'phone', placeholder: 'رقم الهاتف' },
                { key: 'parent_phone', placeholder: 'هاتف ولي الأمر' },
                { key: 'grade_class', placeholder: 'الصف / الفصل' },
              ].map(field => (
                <input
                  key={field.key}
                  placeholder={field.placeholder}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                />
              ))}
              <textarea
                placeholder="ملاحظات"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
              />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-start' }}>
              <button
                onClick={handleSave}
                disabled={loading || !form.full_name.trim()}
                style={{
                  background: loading || !form.full_name.trim() ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  borderRadius: 10, padding: '9px 24px',
                  fontSize: 13, fontWeight: 600,
                  color: loading || !form.full_name.trim() ? '#4b5563' : '#818cf8',
                  cursor: loading || !form.full_name.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={() => setDialogOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.08)',
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

      {/* Delete Confirm Dialog */}
      {deleteConfirmId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={e => e.target === e.currentTarget && setDeleteConfirmId(null)}>
          <div style={{
            background: '#0f0f17',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 18, padding: '28px',
            width: '100%', maxWidth: 360,
            direction: 'rtl', textAlign: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Trash2 size={20} color="#f87171" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>حذف الطالب</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 22px' }}>هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
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
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.08)',
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

export default Students;