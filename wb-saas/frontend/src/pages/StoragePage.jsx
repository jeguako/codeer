import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { MetricCard } from '../components/Card';
import DateRangePicker from '../components/DateRangePicker';
import styles from './TablePage.module.css';

function fmtDate(d) { return d.toISOString().slice(0, 10); }
function fmt(n) { return n ? parseFloat(n).toLocaleString('ru', { maximumFractionDigits: 2 }) + ' ₽' : '—'; }

export default function StoragePage() {
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
      const data = await api.get(`/analytics/storage?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`);
      setRows(data);
    } catch (err) {
      setError(err.error || 'Нет данных');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const totalStorage = rows.reduce((s, r) => s + parseFloat(r.storage_cost || 0), 0);
  const totalLogistics = rows.reduce((s, r) => s + parseFloat(r.logistics_cost || 0), 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Платное хранение</h1>
          <p className={styles.sub}>Расходы на хранение по товарам</p>
        </div>
        <DateRangePicker dateFrom={range.dateFrom} dateTo={range.dateTo} onChange={setRange} />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {rows.length > 0 && (
        <div className={styles.metrics}>
          <MetricCard icon="🏪" label="Хранение" value={fmt(totalStorage)} color="var(--red)" />
          <MetricCard icon="🚚" label="Логистика хранения" value={fmt(totalLogistics)} color="var(--orange)" />
          <MetricCard icon="📦" label="Товаров" value={rows.length} />
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
                <th>Артикул</th>
                <th>Категория</th>
                <th>Бренд</th>
                <th>Склад</th>
                <th>Хранение ₽</th>
                <th>Логистика ₽</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td><span className={styles.code}>{r.vendor_code || r.nm_id}</span></td>
                  <td>{r.subject_name || '—'}</td>
                  <td>{r.brand_name || '—'}</td>
                  <td>{r.warehouse_name || '—'}</td>
                  <td className={styles.red}>{fmt(r.storage_cost)}</td>
                  <td className={styles.orange}>{fmt(r.logistics_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
