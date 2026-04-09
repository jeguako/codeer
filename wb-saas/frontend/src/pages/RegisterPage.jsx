import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './AuthPage.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
    } catch (err) {
      setError(err.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.box}>
        <div className={styles.logo}>
          <span>💸</span>
          <span>CashFlow WB</span>
        </div>
        <h1 className={styles.title}>Регистрация</h1>
        <p className={styles.sub}>7 дней бесплатно — без карты</p>

        <form onSubmit={submit} className={styles.form}>
          <div className={styles.field}>
            <label>Имя</label>
            <input name="name" placeholder="Ваше имя" value={form.name} onChange={handle} />
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input name="email" type="email" placeholder="seller@example.com" value={form.email} onChange={handle} required />
          </div>
          <div className={styles.field}>
            <label>Пароль</label>
            <input name="password" type="password" placeholder="Минимум 6 символов" value={form.password} onChange={handle} required />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Создаём аккаунт...' : 'Создать аккаунт →'}
          </button>
        </form>

        <p className={styles.switch}>
          Уже есть аккаунт?{' '}
          <Link to="/login" className={styles.link}>Войти</Link>
        </p>
      </div>
    </div>
  );
}
