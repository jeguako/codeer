import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../services/api';
import { MetricCard } from '../components/Card';
import DateRangePicker from '../components/DateRangePicker';
import styles from './DashboardPage.module.css';

function fmt(n) {
  if (!n && n !== 0) return '—';
  const v = parseFloat(n);
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' млн ₽';
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + ' тыс ₽';
  return v.toFixed(0) + ' ₽';
}

function fmtDate(d) { return d.toISOString().slice(0, 10); }

const EXPENSE_COLORS = ['#eb445a', '#ff6b35', '#ffc409', '#428cff', '#7c5cfc'];

export default function DashboardPage() {
  const today = new Date();
  const [range, setRange] = useState({
    dateFrom: fmtDate(new Date(Date.now() - 30 * 86400000)),
    dateTo:   fmtDate(today),
  });
  const [summary, setSummary] = useState(null);
  const [byDay, setByDay] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = `?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`;
      const [s, days, cats] = await Promise.all([
        api.get(`/analytics/dashboard${params}`),
        api.get(`/analytics/by-day${params}`),
        api.get(`/analytics/by-category${params}`),
      ]);
      setSummary(s);
      setByDay(days.map((d) => ({ ...d, day: d.day?.slice(0, 10) })));
      setByCategory(cats.slice(0, 8));
    } catch (err) {
      setError(err.error || 'Нет данных. Загрузите данные на странице «Загрузка».');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const expenses = summary ? [
    { name: 'Логистика',   value: parseFloat(summary.logistics)    },
    { name: 'Хранение',    value: parseFloat(summary.storage_cost) },
    { name: 'Реклама',     value: parseFloat(summary.ads_spend)    },
    { name: 'Штрафы',      value: parseFloat(summary.penalties)    },
    { name: 'Эквайринг',   value: parseFloat(summary.acquiring)    },
  ].filter((e) => e.value > 0) : [];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Главная</h1>
          <p className={styles.sub}>Финансовая аналитика Wildberries</p>
        </div>
        <DateRangePicker dateFrom={range.dateFrom} dateTo={range.dateTo} onChange={setRange} />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading && <div className={styles.loading}>Загружаем данные...</div>}

      {summary && !loading && (
        <>
          {/* Key metrics */}
          <div className={styles.metrics}>
            <MetricCard icon="💰" label="Выручка к выплате" value={fmt(summary.revenue)} color="var(--green)" />
            <MetricCard icon="📈" label="Оборот" value={fmt(summary.gross_revenue)} />
            <MetricCard icon="✅" label="Прибыль" value={fmt(summary.profit)}
              color={summary.profit >= 0 ? 'var(--green)' : 'var(--red)'}
              sub={`Маржа ${summary.margin}%`}
            />
            <MetricCard icon="🛒" label="Заказов" value={summary.total_orders?.toLocaleString('ru')} />
            <MetricCard icon="📦" label="Продаж" value={summary.sales_count?.toLocaleString('ru')} />
            <MetricCard icon="↩️" label="Возвратов" value={summary.returns_count?.toLocaleString('ru')}
              color={summary.returns_count > 0 ? 'var(--red)' : undefined}
            />
          </div>

          {/* Expense breakdown */}
          <div className={styles.row2}>
            <div className={styles.expenseCards}>
              <h2 className={styles.sectionTitle}>Расходы</h2>
              <div className={styles.expenseList}>
                <div className={styles.expenseItem}>
                  <span className={styles.expDot} style={{ background: '#eb445a' }} />
                  <span className={styles.expName}>Логистика WB</span>
                  <span className={styles.expVal}>{fmt(summary.logistics)}</span>
                </div>
                <div className={styles.expenseItem}>
                  <span className={styles.expDot} style={{ background: '#ff6b35' }} />
                  <span className={styles.expName}>Платное хранение</span>
                  <span className={styles.expVal}>{fmt(summary.storage_cost)}</span>
                </div>
                <div className={styles.expenseItem}>
                  <span className={styles.expDot} style={{ background: '#ffc409' }} />
                  <span className={styles.expName}>Реклама</span>
                  <span className={styles.expVal}>{fmt(summary.ads_spend)}</span>
                </div>
                <div className={styles.expenseItem}>
                  <span className={styles.expDot} style={{ background: '#428cff' }} />
                  <span className={styles.expName}>Штрафы</span>
                  <span className={styles.expVal}>{fmt(summary.penalties)}</span>
                </div>
                <div className={styles.expenseItem}>
                  <span className={styles.expDot} style={{ background: '#7c5cfc' }} />
                  <span className={styles.expName}>Эквайринг</span>
                  <span className={styles.expVal}>{fmt(summary.acquiring)}</span>
                </div>
                <div className={`${styles.expenseItem} ${styles.expenseTotal}`}>
                  <span className={styles.expName}>Итого расходы</span>
                  <span className={styles.expVal} style={{ color: 'var(--red)' }}>
                    {fmt(
                      parseFloat(summary.logistics) +
                      parseFloat(summary.storage_cost) +
                      parseFloat(summary.ads_spend) +
                      parseFloat(summary.penalties) +
                      parseFloat(summary.acquiring)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {expenses.length > 0 && (
              <div className={styles.pieWrap}>
                <h2 className={styles.sectionTitle}>Структура расходов</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={expenses} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={false}>
                      {expenses.map((_, i) => (
                        <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend formatter={(v) => <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Revenue by day chart */}
          {byDay.length > 0 && (
            <div className={styles.chartWrap}>
              <h2 className={styles.sectionTitle}>Выручка по дням</h2>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={byDay} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + 'к' : v} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }}
                    labelStyle={{ color: 'var(--text)' }}
                    formatter={(v) => [fmt(v), 'Выручка']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#7c5cfc" strokeWidth={2} fill="url(#gRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By category */}
          {byCategory.length > 0 && (
            <div className={styles.chartWrap}>
              <h2 className={styles.sectionTitle}>Выручка по категориям</h2>
              <div className={styles.catList}>
                {byCategory.map((c, i) => {
                  const maxRev = parseFloat(byCategory[0].revenue);
                  const pct = maxRev > 0 ? (parseFloat(c.revenue) / maxRev) * 100 : 0;
                  return (
                    <div key={i} className={styles.catItem}>
                      <div className={styles.catMeta}>
                        <span className={styles.catName}>{c.category || '—'}</span>
                        <span className={styles.catVal}>{fmt(c.revenue)}</span>
                      </div>
                      <div className={styles.catBar}>
                        <div className={styles.catBarFill} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={styles.catStats}>
                        <span>Продаж: {parseInt(c.sales).toLocaleString('ru')}</span>
                        <span>Возвратов: {parseInt(c.returns).toLocaleString('ru')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
