import {Link, useRouteError} from 'react-router';
import styles from '~/styles/Account.module.css';
/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context}) {
  const url = new URL(request.url);
  const acrValues = url.searchParams.get('acr_values') || undefined;
  const loginHint = url.searchParams.get('login_hint') || undefined;
  const loginHintMode = url.searchParams.get('login_hint_mode') || undefined;
  const locale = url.searchParams.get('locale') || undefined;

  return context.customerAccount.login({
    countryCode: context.storefront.i18n.country,
    acrValues,
    loginHint,
    loginHintMode,
    locale,
  });
}

/** @typedef {import('./+types/account_.login').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */


export function ErrorBoundary() {
  const error = useRouteError();
  console.error('[Essenze login]', error);

  return (
    <main className={styles.loginErrorPage}>
      <section className={styles.loginErrorCard}>
        <p className={styles.eyebrow}>Mi cuenta</p>
        <h1>No pudimos iniciar la sesión.</h1>
        <p>
          La conexión de acceso no respondió correctamente. Puedes intentarlo de
          nuevo sin perder tu carrito ni tu navegación en Essenze.
        </p>
        <div className={styles.loginErrorActions}>
          <Link to="/account/login" reloadDocument className={styles.loginPrimaryAction}>
            Intentar de nuevo
          </Link>
          <Link to="/" className={styles.loginSecondaryAction}>
            Volver a Essenze
          </Link>
        </div>
      </section>
    </main>
  );
}
