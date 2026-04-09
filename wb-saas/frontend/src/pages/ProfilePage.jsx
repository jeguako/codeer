import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/Card';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Профиль</h1>

      <Card className={styles.card}>
        <div className={styles.avatar}>
          {(user?.name || user?.email || 'U')[0].toUpperCase()}
        </div>
        <div className={styles.name}>{user?.name || '—'}</div>
        <div className={styles.email}>{user?.email}</div>

        <div className={styles.planBadge}>
          {user?.plan === 'trial' ? '⏳ Пробный период' : `✅ ${user?.plan}`}
        </div>
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>О сервисе</h2>
        <p className={styles.aboutText}>
          <strong>CashFlow WB</strong> — аналитическая платформа для селлеров Wildberries.<br /><br />
          Загружайте данные через WB API и получайте полную финансовую картину: выручку, расходы, прибыль, склады и рекламу в одном месте.
        </p>
      </Card>

      <button className={styles.logoutBtn} onClick={logout}>
        ⏏ Выйти из аккаунта
      </button>
    </div>
  );
}
