import styles from './DateRangePicker.module.css';

const presets = [
  { label: '7 дней',   days: 7  },
  { label: '30 дней',  days: 30 },
  { label: '90 дней',  days: 90 },
];

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

export default function DateRangePicker({ dateFrom, dateTo, onChange }) {
  const applyPreset = (days) => {
    const to = new Date();
    const from = new Date(Date.now() - days * 86400000);
    onChange({ dateFrom: fmt(from), dateTo: fmt(to) });
  };

  return (
    <div className={styles.root}>
      <div className={styles.presets}>
        {presets.map((p) => (
          <button key={p.days} className={styles.preset} onClick={() => applyPreset(p.days)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className={styles.inputs}>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value, dateTo })}
        />
        <span className={styles.sep}>—</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onChange({ dateFrom, dateTo: e.target.value })}
        />
      </div>
    </div>
  );
}
