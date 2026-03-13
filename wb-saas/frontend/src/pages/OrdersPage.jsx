import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { MetricCard } from '../components/Card';
import DateRangePicker from '../components/DateRangePicker';
import styles from './TablePage.module.css';

function fmtDate(d) { return d.toISOString().slice(0, 10); }
function fmt(n) { return n ? parseFloat(n).toLocaleString('ru', { maximumFractionDigits: 0 }) + ' ₽' : '—'; }

export default function OrdersPage() {
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
      const data = await api.get(`/analytics/top-products?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}&limit=50`);
      setRows(data);
    } catch (err) {
      setError(err.error || 'Нет данных');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const totalRev = rows.reduce((s, r) => s + parseFloat(r.revenue || 0), 0);
  const totalSales = rows.reduce((s, r) => s + parseInt(r.sales || 0), 0);
  const totalReturns = rows.reduce((s, r) => s + parseInt(r.returns || 0), 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Заказы и продажи</h1>
          <p className={styles.sub}>Топ-50 товаров по выручке</p>
        </div>
        <DateRangePicker dateFrom={range.dateFrom} dateTo={range.dateTo} onChange={setRange} />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {rows.length > 0 && (
        <div className={styles.metrics}>
          <MetricCard icon="💰" label="Выручка" value={fmt(totalRev)} color="var(--green)" />
          <MetricCard icon="📦" label="Продаж" value={totalSales.toLocaleString('ru')} />
          <MetricCard icon="↩️" label="Возвратов" value={totalReturns.toLocaleString('ru')} color={totalReturns > 0 ? 'var(--red)' : undefined} />
        </div>
      )}

      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.loading}>Загружаем...</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>Нет данных за выбранный период</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Артикул</th>
                <th>Категория</th>
                <th>Продаж</th>
                <th>Возвратов</th>
                <th>Выручка</th>
                <th>Логистика</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className={styles.num}>{i + 1}</td>
                  <td><span className={styles.code}>{r.vendor_code || r.nm_id}</span></td>
                  <td>{r.subject_name || '—'}</td>
                  <td className={styles.green}>{parseInt(r.sales).toLocaleString('ru')}</td>
                  <td className={r.returns > 0 ? styles.red : ''}>{parseInt(r.returns).toLocaleString('ru')}</td>
                  <td className={styles.green}>{fmt(r.revenue)}</td>
                  <td className={styles.orange}>{fmt(r.logistics)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
