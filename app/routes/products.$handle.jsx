import {useState} from 'react';
import { Link, useLoaderData } from 'react-router';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  Money,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import { ProductPrice } from '~/components/ProductPrice';
import {ProductImageGallery} from '~/components/ProductImageGallery';
import { ProductForm } from '~/components/ProductForm';
import EssenzeIcon from '~/components/EssenzeIcon';
import {AddToCartButton} from '~/components/AddToCartButton';
import AvailabilityBadge from '~/components/AvailabilityBadge';
import {useAside} from '~/components/Aside';
import {
  ProductMetafields,
  PRODUCT_METAFIELD_IDENTIFIERS,
} from '~/components/ProductMetafields';
import { redirectIfHandleIsLocalized } from '~/lib/redirect';
import {queueProductForComparison} from '~/lib/fragranceComparator';
import styles from '~/components/product.module.css';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({ data }) => {
  const product = data?.product;

  return [
    {
      title: `${product?.seo?.title || product?.title || 'Perfume'} | Essenze`,
    },
    {
      name: 'description',
      content:
        product?.seo?.description ||
        product?.description ||
        'Descubre esta fragancia seleccionada por Essenze.',
    },
    {
      tagName: 'link',
      rel: 'canonical',
      href: `/products/${product?.handle || ''}`,
    },
  ];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);

  return { ...deferredData, ...criticalData };
}

/**
 * @param {Route.LoaderArgs} args
 */
async function loadCriticalData({ context, params, request }) {
  const { handle } = params;
  const { storefront } = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{ product }] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {
        handle,
        selectedOptions: getSelectedProductOptions(request),
        metafieldIdentifiers: PRODUCT_METAFIELD_IDENTIFIERS,
      },
    }),
  ]);

  if (!product?.id) {
    throw new Response(null, { status: 404 });
  }

  redirectIfHandleIsLocalized(request, { handle, data: product });

  return { product };
}

/**
 * @param {Route.LoaderArgs} args
 */
function loadDeferredData() {
  return {};
}

export default function Product() {
  const [compareState, setCompareState] = useState('idle');
  /** @type {LoaderReturnData} */
  const { product } = useLoaderData();

  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const { title, description, descriptionHtml, vendor } = product;
  const galleryImages = [selectedVariant?.image, ...(product.images?.nodes || [])].filter(Boolean);
  const isAvailable = Boolean(selectedVariant?.availableForSale);

  return (
    <main className={styles.page}>
      <div className={styles.productContainer}>
        <nav className={styles.breadcrumbs} aria-label="Navegación de producto">
          <Link to="/">Inicio</Link>
          <span aria-hidden="true">/</span>
          <Link to="/collections/all">Perfumería</Link>
          {vendor ? (
            <>
              <span aria-hidden="true">/</span>
              <Link to={`/marcas/${encodeURIComponent(vendor)}`}>{vendor}</Link>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>

        <section className={styles.productHero}>
          <div className={styles.mediaColumn}>
            <div className={styles.mediaStage}>
              <div className={styles.productImage}>
                <ProductImageGallery
                  images={galleryImages}
                  title={title}
                  selectedImageId={selectedVariant?.image?.id}
                />
              </div>
            </div>
          </div>

          <div className={styles.purchaseCard}>
            <div className={styles.statusRow}>
              <span className={styles.vendor}>{vendor || 'Essenze'}</span>
              <AvailabilityBadge available={isAvailable} />
            </div>

            <h1 className={styles.title}>{title}</h1>
            <p className={styles.category}>Perfumería de autor</p>

            <ProductPrice
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
            />
            <p className={styles.priceNote}>
              Impuestos y envío calculados al finalizar la compra.
            </p>

            <div className={styles.divider} />

            {description ? (
              <p className={styles.shortDescription}>{description}</p>
            ) : null}

            <ProductForm
              productOptions={productOptions}
              selectedVariant={selectedVariant}
            />

            <button
              type="button"
              className={`${styles.compareButton} ${compareState === 'added' ? styles.compareButtonAdded : ''}`}
              onClick={() => {
                queueProductForComparison(product.id);
                setCompareState('added');
                window.setTimeout(() => setCompareState('idle'), 1600);
              }}
            >
              <span aria-hidden="true">{compareState === 'added' ? '✓' : '＋'}</span>
              {compareState === 'added' ? 'Agregada al comparador' : 'Comparar esta fragancia'}
            </button>

            <div
              className={styles.serviceGrid}
              aria-label="Beneficios de compra"
            >
              <div className={styles.serviceItem}>
                <span className={styles.serviceNumber} aria-hidden="true">
                  <EssenzeIcon name="shield" size={20} />
                </span>
                <div>
                  <strong>Pago protegido</strong>
                  <span>Proceso de compra seguro</span>
                </div>
              </div>
              <div className={styles.serviceItem}>
                <span className={styles.serviceNumber} aria-hidden="true">
                  <EssenzeIcon name="package" size={20} />
                </span>
                <div>
                  <strong>Empaque cuidado</strong>
                  <span>Preparado para preservar cada detalle</span>
                </div>
              </div>
              <div className={styles.serviceItem}>
                <span className={styles.serviceNumber} aria-hidden="true">
                  <EssenzeIcon name="headset" size={20} />
                </span>
                <div>
                  <strong>Atención personal</strong>
                  <span>Acompañamiento antes y después de comprar</span>
                </div>
              </div>
            </div>

            <div className={styles.accordions}>
              <details className={styles.accordion} open>
                <summary>
                  <span>La fragancia</span>
                  <span aria-hidden="true">+</span>
                </summary>
                <div
                  className={styles.descriptionContent}
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              </details>

              <details className={styles.accordion}>
                <summary>
                  <span>Envíos y devoluciones</span>
                  <span aria-hidden="true">+</span>
                </summary>
                <p>
                  Los tiempos y costos se muestran durante el checkout según tu
                  ubicación. Consulta las políticas de la tienda para conocer
                  las condiciones aplicables.
                </p>
              </details>

              <details className={styles.accordion}>
                <summary>
                  <span>Asesoría Essenze</span>
                  <span aria-hidden="true">+</span>
                </summary>
                <p>
                  Te ayudamos a elegir concentración, familia olfativa y ocasión
                  de uso para encontrar una fragancia realmente personal.
                </p>
              </details>
            </div>
          </div>
        </section>
      </div>

      <ProductMetafields metafields={product.metafields} />
      <MobileProductBar selectedVariant={selectedVariant} title={title} />

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </main>
  );
}

function MobileProductBar({selectedVariant, title}) {
  const {open} = useAside();
  if (!selectedVariant) return null;

  return (
    <div className={styles.mobilePurchaseBar} aria-label={`Compra rápida de ${title}`}>
      <div className={styles.mobilePurchasePrice}>
        <AvailabilityBadge
          available={selectedVariant.availableForSale}
          compact
        />
        <strong><Money data={selectedVariant.price} /></strong>
      </div>
      <div className={styles.mobilePurchaseAction}>
        <AddToCartButton
          disabled={!selectedVariant.availableForSale}
          onClick={() => open('cart')}
          lines={[{merchandiseId: selectedVariant.id, quantity: 1, selectedVariant}]}
        >
          {selectedVariant.availableForSale ? 'Agregar' : 'Agotado'}
        </AddToCartButton>
      </div>
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
`;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    images(first: 12) {
      nodes { id url altText width height }
    }
    metafields(identifiers: $metafieldIdentifiers) {
      id
      namespace
      key
      type
      value
      reference {
        __typename
        ... on MediaImage {
          image {
            id
            url
            altText
            width
            height
          }
        }
        ... on Product {
          id
          handle
          title
          vendor
          productType
          availableForSale
          featuredImage {
            id
            url
            altText
            width
            height
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
      references(first: 12) {
        nodes {
          __typename
          ... on MediaImage {
            image {
              id
              url
              altText
              width
              height
            }
          }
          ... on Product {
            id
            handle
            title
            vendor
            productType
            availableForSale
            featuredImage {
              id
              url
              altText
              width
              height
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $metafieldIdentifiers: [HasMetafieldsIdentifier!]!
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
`;

/** @typedef {import('./+types/products.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
