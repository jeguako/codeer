import { useState, useEffect } from 'react';
import api from '../services/api';
import { MetricCard } from '../components/Card';
import styles from './TablePage.module.css';

export default function WarehousesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/analytics/warehouses')
      .then(setRows)
      .catch((err) => setError(err.error || 'Нет данных'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) =>
    !search ||
    (r.vendor_code || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.subject || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalQty = rows.reduce((s, r) => s + parseInt(r.quantity || 0), 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Склады</h1>
          <p className={styles.sub}>Остатки товаров на складах WB</p>
        </div>
        <input
          className={styles.search}
          placeholder="🔍 Поиск по артикулу..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {rows.length > 0 && (
        <div className={styles.metrics}>
          <MetricCard icon="📦" label="Всего остаток" value={totalQty.toLocaleString('ru')} />
          <MetricCard icon="📊" label="Позиций" value={rows.length} />
        </div>
      )}

      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.loading}>Загружаем...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>Нет данных. Загрузите остатки на странице «Загрузка».</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Артикул</th>
                <th>Категория</th>
                <th>Бренд</th>
                <th>Склад</th>
                <th>Остаток</th>
                <th>В пути (к клиенту)</th>
                <th>В пути (от клиента)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i}>
                  <td><span className={styles.code}>{r.vendor_code || r.nm_id}</span></td>
                  <td>{r.subject || '—'}</td>
                  <td>{r.brand || '—'}</td>
                  <td>{r.warehouse_name || '—'}</td>
                  <td className={parseInt(r.quantity) > 0 ? styles.green : styles.red}>
                    {parseInt(r.quantity || 0).toLocaleString('ru')}
                  </td>
                  <td>{parseInt(r.in_way_to_client || 0).toLocaleString('ru')}</td>
                  <td>{parseInt(r.in_way_from_client || 0).toLocaleString('ru')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
