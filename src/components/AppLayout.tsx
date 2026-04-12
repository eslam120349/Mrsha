import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  LogOut,
  Menu,
  X,
  GraduationCap,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/students', label: 'الطلاب', icon: Users },
  { path: '/lessons', label: 'الدروس', icon: BookOpen },
];

const AppLayout = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif",
      color: '#e2e8f0',
    }}>

      {/* Ambient glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.05) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(16,185,129,0.04) 0%, transparent 55%)',
      }} />

      {/* Mobile header */}
      <div style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: 'rgba(10,10,15,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        zIndex: 40,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GraduationCap size={16} color="#818cf8" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>إدارة الطلاب</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#94a3b8',
          }}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top: 0, right: 0,
        width: 240, height: '100%',
        background: 'rgba(13,13,20,0.98)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
        transform: sidebarOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.22s ease',
      }}>

        {/* Logo */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <GraduationCap size={20} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>إدارة الطلاب</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>نظام المعلم</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? '#818cf8' : '#64748b',
                  background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  border: active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                {active && (
                  <div style={{
                    position: 'absolute', right: 0, top: '20%', bottom: '20%',
                    width: 3, borderRadius: '3px 0 0 3px',
                    background: 'linear-gradient(180deg, #6366f1, #818cf8)',
                  }} />
                )}
                <item.icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={signOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '10px 14px',
              borderRadius: 10, border: '1px solid transparent',
              background: 'transparent',
              fontSize: 13, color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
              (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.15)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#475569';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
            }}
          >
            <LogOut size={17} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        marginRight: 240,
        paddingTop: 0,
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
      }}>
        <div style={{ padding: '32px' }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        @media (max-width: 1023px) {
          .mobile-header { display: flex !important; }
          aside { transform: translateX(100%); }
          main { margin-right: 0 !important; padding-top: 56px !important; }
        }
      `}</style>
    </div>
  );
};

export default AppLayout;