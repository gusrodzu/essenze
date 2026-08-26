import {useMemo, useState} from 'react';
import {Link, useLoaderData, useSearchParams} from 'react-router';
import {Money} from '@shopify/hydrogen';
import UnifiedProductCard from '~/components/UnifiedProductCard';
import {queueProductForComparison} from '~/lib/fragranceComparator';
import {
  RECOMMENDATION_METAFIELD_IDENTIFIERS,
  getSelectionLabels,
  rankFragranceProducts,
} from '~/lib/fragranceRecommendations';
import styles from '~/styles/AdvisorResults.module.css';

const PAGE_SIZE = 12;

export const meta = () => [
  {title: 'Tus recomendaciones | Essenze'},
  {name: 'description', content: 'Explora todas las fragancias seleccionadas para tu perfil olfativo.'},
];

export async function loader({context}) {
  const {products} = await context.storefront.query(ADVISOR_RESULTS_QUERY, {
    variables: {first: 100, metafieldIdentifiers: RECOMMENDATION_METAFIELD_IDENTIFIERS},
  });
  return {products: products?.nodes || []};
}

export default function AdvisorResultsPage() {
  const {products} = useLoaderData();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const selections = useMemo(() => ({
    recipient: searchParams.get('recipient'),
    gender: searchParams.get('gender'),
    personality: searchParams.get('personality'),
    occasion: searchParams.get('occasion'),
    intensity: searchParams.get('intensity'),
  }), [searchParams]);
  const ranked = useMemo(() => rankFragranceProducts(products, selections, products.length), [products, selections]);
  const labels = useMemo(() => getSelectionLabels(selections), [selections]);
  const totalPages = Math.max(1, Math.ceil(ranked.recommendations.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = ranked.recommendations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goToPage = (nextPage) => {
    setPage(nextPage);
    window.requestAnimationFrame(() => document.getElementById('advisor-results-grid')?.scrollIntoView({behavior: 'smooth', block: 'start'}));
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Selección exclusiva Essenze</p>
        <h1>Fragancias elegidas para ti</h1>
        <p>Ordenamos el catálogo usando tus respuestas para mostrar primero las opciones con mayor afinidad.</p>
        <div className={styles.profile}>{labels.map((label) => <span key={label}>{label}</span>)}</div>
        <div className={styles.heroActions}>
          <Link to="/asesor">Repetir quiz</Link>
          <Link to="/comparador">Ver comparador</Link>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.summary}>
          <strong>{ranked.recommendations.length} productos seleccionados</strong>
          <span>Página {safePage} de {totalPages}</span>
        </div>
        <div id="advisor-results-grid" className={styles.grid}>
          {visible.map(({product, percentage, matchDetails, isFallback}, index) => (
            <UnifiedProductCard
              key={product.id}
              available={product.availableForSale !== false}
              badges={[
                {label: isFallback ? 'Seleccionada especialmente para ti' : `Elegida para ti · ${percentage}% afinidad`, tone: 'gold', key: 'affinity'},
                ...matchDetails.slice(0, 2).map((match) => ({label: match.label, tone: 'neutral', key: match.key})),
              ]}
              dataProductId={product.id}
              image={product.featuredImage}
              loading={index < 6 ? 'eager' : 'lazy'}
              onCompare={() => queueProductForComparison(product.id)}
              price={product.priceRange?.minVariantPrice ? <Money data={product.priceRange.minVariantPrice} /> : 'Consultar precio'}
              productType={product.productType || 'Perfumería selecta'}
              title={product.title}
              to={`/products/${product.handle}`}
              vendor={product.vendor}
            />
          ))}
        </div>

        {totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Paginación de recomendaciones">
            <button type="button" disabled={safePage === 1} onClick={() => goToPage(safePage - 1)}>← Anterior</button>
            <div className={styles.pages}>
              {Array.from({length: totalPages}, (_, index) => index + 1).map((number) => (
                <button key={number} type="button" className={number === safePage ? styles.current : ''} aria-current={number === safePage ? 'page' : undefined} onClick={() => goToPage(number)}>{number}</button>
              ))}
            </div>
            <button type="button" disabled={safePage === totalPages} onClick={() => goToPage(safePage + 1)}>Siguiente →</button>
          </nav>
        ) : null}
      </section>
    </main>
  );
}

const ADVISOR_RESULTS_QUERY = `#graphql
  fragment AdvisorResultProduct on Product {
    id title handle vendor productType description availableForSale tags
    priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
    featuredImage { id url altText width height }
    metafields(identifiers: $metafieldIdentifiers) { id namespace key type value }
  }
  query AdvisorResultProducts($country: CountryCode, $language: LanguageCode, $first: Int!, $metafieldIdentifiers: [HasMetafieldsIdentifier!]!)
  @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: BEST_SELLING) { nodes { ...AdvisorResultProduct } }
  }
`;
