import {Link, useLoaderData} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import styles from '~/styles/EditorialPage.module.css';

export const meta = () => [{title: 'Journal | Essenze'}, {name: 'description', content: 'Historias, guías y cultura olfativa seleccionadas por Essenze.'}];

export async function loader(args) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}
async function loadCriticalData({context, request}) {
  const paginationVariables = getPaginationVariables(request, {pageBy: 9});
  const {blogs} = await context.storefront.query(BLOGS_QUERY, {variables: {...paginationVariables}});
  return {blogs};
}
function loadDeferredData() { return {}; }

export default function Blogs() {
  const {blogs} = useLoaderData();
  return (
    <main className={styles.page}>
      <section className={`${styles.hero} ${styles.heroDark}`}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Essenze Journal</p>
          <h1 className={styles.title}>Historias que también se perciben.</h1>
          <p className={styles.lede}>Guías, casas, ingredientes y cultura de perfumería para entender mejor lo que llevas sobre la piel.</p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Editorial</p><h2>Explora el journal</h2></div><p>Una biblioteca en crecimiento para descubrir perfumes con más contexto.</p></div>
        <PaginatedResourceSection connection={blogs} resourcesClassName={styles.grid} ariaLabel="Secciones del Journal">
            {({node: blog}) => (
              <Link className={styles.card} key={blog.handle} prefetch="intent" to={`/blogs/${blog.handle}`}>
                <small>Journal</small><h2>{blog.title}</h2><p>{blog.seo?.description || 'Artículos, novedades y cultura olfativa.'}</p><span className={styles.cardArrow}>→</span>
              </Link>
            )}
        </PaginatedResourceSection>
      </section>
    </main>
  );
}

const BLOGS_QUERY = `#graphql
  query Blogs($country: CountryCode,$endCursor: String,$first: Int,$language: LanguageCode,$last: Int,$startCursor: String)
  @inContext(country: $country, language: $language) {
    blogs(first: $first,last: $last,before: $startCursor,after: $endCursor) {
      pageInfo {hasNextPage hasPreviousPage startCursor endCursor}
      nodes {title handle seo {title description}}
    }
  }
`;
/** @typedef {import('./+types/blogs._index').Route} Route */
