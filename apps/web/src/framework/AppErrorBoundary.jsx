import {Component} from 'react';
import styles from './AppErrorBoundary.module.css';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error('BuzzBee render error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    window.localStorage.removeItem('buzzbee-theme');
    window.localStorage.removeItem('erp-sidebar-collapsed');
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <div className={styles.mark}>B</div>
          <span className={styles.eyebrow}>BuzzBee Foundation</span>
          <h1>No pudimos mostrar esta pantalla</h1>
          <p>
            La aplicación detectó un error de renderizado y lo contuvo para
            evitar una pantalla completamente en blanco.
          </p>

          <pre>{this.state.error?.message || 'Error desconocido'}</pre>

          <div className={styles.actions}>
            <button onClick={this.handleReload}>Recargar aplicación</button>
            <button className={styles.secondary} onClick={this.handleReset}>
              Restablecer interfaz
            </button>
          </div>
        </section>
      </main>
    );
  }
}
