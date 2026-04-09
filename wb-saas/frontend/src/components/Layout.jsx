import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './Layout.module.css';

const nav = [
  { to: '/',           icon: '🏠', label: 'Главная'    },
  { to: '/orders',     icon: '📦', label: 'Заказы'     },
  { to: '/storage',    icon: '🏪', label: 'Хранение'   },
  { to: '/warehouses', icon: '📊', label: 'Склады'     },
  { to: '/ads',        icon: '📣', label: 'Реклама'    },
  { to: '/sync',       icon: '🔄', label: 'Загрузка'   },
  { to: '/profile',    icon: '👤', label: 'Профиль'    },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.root}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>💸</span>
          <span className={styles.logoText}>CashFlow WB</span>
        </div>

        <nav className={styles.nav}>
          {nav.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{icon}</span>
              <span className={styles.navLabel}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.userBlock}>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name || user?.email?.split('@')[0]}</div>
            <div className={styles.userPlan}>{user?.plan === 'trial' ? 'Пробный период' : user?.plan}</div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Выйти">⏏</button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Mobile nav */}
      <nav className={styles.mobileNav}>
        {nav.slice(0, 5).map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `${styles.mobileNavItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.mobileIcon}>{icon}</span>
            <span className={styles.mobileLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
