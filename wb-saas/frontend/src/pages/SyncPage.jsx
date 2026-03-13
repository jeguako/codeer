import { useState, useEffect } from 'react';
import api from '../services/api';
import { Card } from '../components/Card';
import styles from './SyncPage.module.css';

function fmtDate(d) { return d.toISOString().slice(0, 10); }

const today = fmtDate(new Date());
const month30ago = fmtDate(new Date(Date.now() - 30 * 86400000));

const JOBS_INFO = {
  paid_storage:   { icon: '🏪', label: 'Платное хранение' },
  detail_report:  { icon: '📄', label: 'Детализация реализаций' },
  orders:         { icon: '📦', label: 'Заказы' },
  sales:          { icon: '💰', label: 'Продажи и возвраты' },
  products:       { icon: '🛍️', label: 'Карточки товаров' },
  stocks:         { icon: '📊', label: 'Остатки на складах' },
};

export default function SyncPage() {
  const [jobs, setJobs] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [newToken, setNewToken] = useState('');
  const [tokenLabel, setTokenLabel] = useState('');
  const [loading, setLoading] = useState({});
  const [msg, setMsg] = useState({});
  const [dates, setDates] = useState({ dateFrom: month30ago, dateTo: today });

  const loadJobs = async () => {
    try {
      const data = await api.get('/sync/jobs');
      setJobs(data);
    } catch {}
  };

  const loadTokens = async () => {
    try {
      const data = await api.get('/tokens');
      setTokens(data);
    } catch {}
  };

  useEffect(() => {
    loadJobs();
    loadTokens();
    const t = setInterval(loadJobs, 5000);
    return () => clearInterval(t);
  }, []);

  const setL = (key, val) => setLoading((p) => ({ ...p, [key]: val }));
  const setM = (key, val) => setMsg((p) => ({ ...p, [key]: val }));

  const syncAction = async (key, fn) => {
    setL(key, true);
    setM(key, '');
    try {
      const result = await fn();
      setM(key, `✅ Загружено: ${result.count} строк`);
      loadJobs();
    } catch (err) {
      setM(key, `❌ ${err.error || err.message || 'Ошибка'}`);
    } finally {
      setL(key, false);
    }
  };

  const addToken = async (e) => {
    e.preventDefault();
    setL('token', true);
    setM('token', '');
    try {
      await api.post('/tokens', { token: newToken, label: tokenLabel });
      setNewToken('');
      setTokenLabel('');
      setM('token', '✅ Токен добавлен и проверен');
      loadTokens();
    } catch (err) {
      setM('token', `❌ ${err.error || 'Ошибка'}`);
    } finally {
      setL('token', false);
    }
  };

  const deleteToken = async (id) => {
    await api.delete(`/tokens/${id}`);
    loadTokens();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Загрузка данных</h1>
        <p className={styles.sub}>Синхронизация данных с Wildberries API</p>
      </div>

      {/* Tokens */}
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>🔑 WB API-токен</h2>
        <p className={styles.hint}>
          Получить токен: ЛК WB → Профиль → Настройки → Доступ к API<br />
          Нужные права: Statistics, Analytics, Content, Marketplace, Advertising
        </p>

        {tokens.map((t) => (
          <div key={t.id} className={styles.tokenRow}>
            <span className={styles.tokenLabel}>{t.label}</span>
            <span className={styles.tokenBadge}>✅ Активен</span>
            <span className={styles.tokenDate}>{new Date(t.created_at).toLocaleDateString('ru')}</span>
            <button className={styles.deleteBtn} onClick={() => deleteToken(t.id)}>✕</button>
          </div>
        ))}

        <form onSubmit={addToken} className={styles.tokenForm}>
          <input
            placeholder="Название токена (необязательно)"
            value={tokenLabel}
            onChange={(e) => setTokenLabel(e.target.value)}
          />
          <input
            placeholder="Вставьте API-токен WB (eyJhbGci...)"
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            required
          />
          <button type="submit" className={styles.btn} disabled={loading.token}>
            {loading.token ? 'Проверяем...' : '+ Добавить токен'}
          </button>
        </form>
        {msg.token && <div className={styles.msg}>{msg.token}</div>}
      </Card>

      {/* Date range */}
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>📅 Период загрузки</h2>
        <div className={styles.dateRow}>
          <div className={styles.dateField}>
            <label>Дата от</label>
            <input type="date" value={dates.dateFrom} onChange={(e) => setDates((d) => ({ ...d, dateFrom: e.target.value }))} />
          </div>
          <div className={styles.dateField}>
            <label>Дата до</label>
            <input type="date" value={dates.dateTo} onChange={(e) => setDates((d) => ({ ...d, dateTo: e.target.value }))} />
          </div>
        </div>
      </Card>

      {/* Sync buttons */}
      <div className={styles.syncGrid}>
        <div className={styles.syncCard} onClick={() => syncAction('storage', () => api.post('/sync/paid-storage', dates))}>
          <span className={styles.syncIcon}>🏪</span>
          <span className={styles.syncLabel}>Платное хранение</span>
          {loading.storage ? <span className={styles.syncStatus}>Загружаем...</span>
            : msg.storage ? <span className={styles.syncStatus}>{msg.storage}</span>
            : <span className={styles.syncHint}>Загрузить</span>}
        </div>

        <div className={styles.syncCard} onClick={() => syncAction('detail', () => api.post('/sync/detail-report', dates))}>
          <span className={styles.syncIcon}>📄</span>
          <span className={styles.syncLabel}>Детализация реализаций</span>
          {loading.detail ? <span className={styles.syncStatus}>Загружаем...</span>
            : msg.detail ? <span className={styles.syncStatus}>{msg.detail}</span>
            : <span className={styles.syncHint}>Загрузить</span>}
        </div>

        <div className={styles.syncCard} onClick={() => syncAction('orders', () => api.post('/sync/orders', { dateFrom: dates.dateFrom }))}>
          <span className={styles.syncIcon}>📦</span>
          <span className={styles.syncLabel}>Заказы</span>
          {loading.orders ? <span className={styles.syncStatus}>Загружаем...</span>
            : msg.orders ? <span className={styles.syncStatus}>{msg.orders}</span>
            : <span className={styles.syncHint}>Загрузить</span>}
        </div>

        <div className={styles.syncCard} onClick={() => syncAction('sales', () => api.post('/sync/sales', { dateFrom: dates.dateFrom }))}>
          <span className={styles.syncIcon}>💰</span>
          <span className={styles.syncLabel}>Продажи и возвраты</span>
          {loading.sales ? <span className={styles.syncStatus}>Загружаем...</span>
            : msg.sales ? <span className={styles.syncStatus}>{msg.sales}</span>
            : <span className={styles.syncHint}>Загрузить</span>}
        </div>

        <div className={styles.syncCard} onClick={() => syncAction('products', () => api.post('/sync/products'))}>
          <span className={styles.syncIcon}>🛍️</span>
          <span className={styles.syncLabel}>Карточки товаров</span>
          {loading.products ? <span className={styles.syncStatus}>Загружаем...</span>
            : msg.products ? <span className={styles.syncStatus}>{msg.products}</span>
            : <span className={styles.syncHint}>Загрузить</span>}
        </div>

        <div className={styles.syncCard} onClick={() => syncAction('stocks', () => api.post('/sync/stocks'))}>
          <span className={styles.syncIcon}>📊</span>
          <span className={styles.syncLabel}>Остатки на складах</span>
          {loading.stocks ? <span className={styles.syncStatus}>Загружаем...</span>
            : msg.stocks ? <span className={styles.syncStatus}>{msg.stocks}</span>
            : <span className={styles.syncHint}>Загрузить</span>}
        </div>
      </div>

      {/* Jobs history */}
      {jobs.length > 0 && (
        <Card className={styles.section}>
          <h2 className={styles.sectionTitle}>📋 История загрузок</h2>
          <div className={styles.jobList}>
            {jobs.map((j) => (
              <div key={j.id} className={styles.jobRow}>
                <span className={styles.jobIcon}>{JOBS_INFO[j.type]?.icon || '⚙️'}</span>
                <span className={styles.jobName}>{JOBS_INFO[j.type]?.label || j.type}</span>
                <span className={`${styles.jobStatus} ${styles[j.status]}`}>{j.status === 'done' ? '✅' : j.status === 'error' ? '❌' : '⏳'} {j.status}</span>
                <span className={styles.jobRows}>{j.rows_loaded} строк</span>
                <span className={styles.jobDate}>{j.started_at ? new Date(j.started_at).toLocaleString('ru') : ''}</span>
                {j.error_message && <span className={styles.jobError}>{j.error_message}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
