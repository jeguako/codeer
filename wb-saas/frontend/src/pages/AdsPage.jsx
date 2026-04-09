import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { MetricCard } from '../components/Card';
import DateRangePicker from '../components/DateRangePicker';
import styles from './TablePage.module.css';

function fmtDate(d) { return d.toISOString().slice(0, 10); }
function fmt(n) { return n ? parseFloat(n).toLocaleString('ru', { maximumFractionDigits: 2 }) + ' ₽' : '—'; }
function fmtN(n) { return n ? parseInt(n).toLocaleString('ru') : '0'; }

export default function AdsPage() {
  const [range, setRange] = useState({
    dateFrom: fmtDate(new Date(Date.now() - 30 * 86400000)),
    dateTo:   fmtDate(new Date()),
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/analytics/ads?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`);
      setRows(data);
    } catch (err) {
      setError(err.error || 'Нет данных');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const totalSpend = rows.reduce((s, r) => s + parseFloat(r.spend || 0), 0);
  const totalViews = rows.reduce((s, r) => s + parseInt(r.views || 0), 0);
  const totalClicks = rows.reduce((s, r) => s + parseInt(r.clicks || 0), 0);
  const totalOrders = rows.reduce((s, r) => s + parseInt(r.orders || 0), 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Реклама</h1>
          <p className={styles.sub}>ВБ.Продвижение — статистика кампаний</p>
        </div>
        <DateRangePicker dateFrom={range.dateFrom} dateTo={range.dateTo} onChange={setRange} />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {rows.length > 0 && (
        <div className={styles.metrics}>
          <MetricCard icon="💸" label="Расход" value={fmt(totalSpend)} color="var(--red)" />
          <MetricCard icon="👁️" label="Показы" value={fmtN(totalViews)} />
          <MetricCard icon="🖱️" label="Клики" value={fmtN(totalClicks)} />
          <MetricCard icon="🛒" label="Заказы" value={fmtN(totalOrders)} color="var(--green)" />
          <MetricCard icon="📊" label="CTR" value={totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) + '%' : '—'} />
        </div>
      )}

      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.loading}>Загружаем...</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>Нет данных. Загрузите рекламную статистику на странице «Загрузка».</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Кампания ID</th>
                <th>Показы</th>
                <th>Клики</th>
                <th>CTR%</th>
                <th>CPC ₽</th>
                <th>Расход ₽</th>
                <th>Заказы</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td><span className={styles.code}>{r.campaign_id}</span></td>
                  <td>{fmtN(r.views)}</td>
                  <td>{fmtN(r.clicks)}</td>
                  <td>{parseFloat(r.ctr || 0).toFixed(2)}%</td>
                  <td>{parseFloat(r.avg_cpc || 0).toFixed(2)} ₽</td>
                  <td className={styles.red}>{fmt(r.spend)}</td>
                  <td className={styles.green}>{fmtN(r.orders)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
