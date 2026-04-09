import styles from './Card.module.css';

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`${styles.card} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricHeader}>
        {icon && <span className={styles.metricIcon}>{icon}</span>}
        <span className={styles.metricLabel}>{label}</span>
      </div>
      <div className={styles.metricValue} style={color ? { color } : {}}>
        {value}
      </div>
      {sub && <div className={styles.metricSub}>{sub}</div>}
    </div>
  );
}
