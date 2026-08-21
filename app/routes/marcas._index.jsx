import {useLoaderData, Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import styles from '~/styles/Brands.module.css';

export const meta = () => [
  {title: 'Marcas | Essenze'},
  {
    name: 'description',
    content: 'Descubre las casas y marcas de perfumería disponibles en Essenze.',
  },
];

export async function loader({context}) {
  const {products} = await context.storefront.query(BRANDS_QUERY);
  const brandMap = new Map();

  for (const product of products.nodes) {
    const name = product.vendor?.trim();
    if (!name) continue;
    const current = brandMap.get(name) || {name, count: 0, image: null};
    current.count += 1;
    if (!current.image && product.featuredImage) current.image = product.featuredImage;
    brandMap.set(name, current);
  }

  const brands = [...brandMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'es', {sensitivity: 'base'}),
  );
  const heroBrands = brands.filter((brand) => brand.image).slice(0, 5);

  return {brands, heroBrands};
}

function slugLetter(letter) {
  return `marca-${encodeURIComponent(letter)}`;
}

export default function BrandsIndex() {
  const {brands, heroBrands} = useLoaderData();
  const groups = brands.reduce((acc, brand) => {
    const letter = brand.name.charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(brand);
    return acc;
  }, {});
  const letters = Object.keys(groups).sort((a, b) =>
    a.localeCompare(b, 'es', {sensitivity: 'base'}),
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Casas seleccionadas</p>
          <h1 className={styles.title}>Nuestras marcas</h1>
          <p className={styles.lede}>
            Descubre casas icónicas, firmas contemporáneas y perfumería de autor
            cuidadosamente seleccionada por Essenze.
          </p>
        </div>

        <div className={styles.heroShowcase} aria-hidden="true">
          {heroBrands.map((brand, index) => (
            <div className={styles.heroBottle} key={brand.name} style={{'--brand-index': index}}>
              <Image
                data={brand.image}
                alt=""
                className={styles.heroBottleImage}
                sizes="180px"
                loading={index < 3 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
        </div>

        <div className={styles.heroStats} aria-label="Resumen de marcas">
          <span>{String(brands.length).padStart(2, '0')}</span>
          <p>casas disponibles en el catálogo Essenze</p>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.utilityBar}>
          <div>
            <p className={styles.utilityLabel}>Índice de casas</p>
            <p className={styles.utilityCopy}>
              Salta a una letra o explora cada firma en orden alfabético.
            </p>
          </div>
          <div className={styles.utilityLinks}>
            <Link to="/collections/all">Todo el catálogo</Link>
            <Link to="/collections">Colecciones</Link>
          </div>
        </div>

        <nav className={styles.alphaBar} aria-label="Índice alfabético">
          <a className={`${styles.alpha} ${styles.alphaActive}`} href="#marcas">Todas</a>
          {letters.map((letter) => (
            <a
              className={styles.alpha}
              key={letter}
              href={`#${slugLetter(letter)}`}
              aria-label={`Ir a marcas con ${letter}`}
            >
              {letter}
            </a>
          ))}
        </nav>

        <div className={styles.groups} id="marcas">
          {letters.map((letter) => (
            <section
              className={styles.group}
              id={slugLetter(letter)}
              key={letter}
              aria-labelledby={`${slugLetter(letter)}-title`}
            >
              <div className={styles.groupHeading}>
                <h2 id={`${slugLetter(letter)}-title`}>{letter}</h2>
                <span>{groups[letter].length} {groups[letter].length === 1 ? 'casa' : 'casas'}</span>
              </div>

              <div className={styles.grid}>
                {groups[letter].map((brand, index) => (
                  <Link
                    key={brand.name}
                    className={styles.brandCard}
                    to={`/marcas/${encodeURIComponent(brand.name)}`}
                    prefetch="intent"
                  >
                    <span className={styles.number}>
                      {letter}.{String(index + 1).padStart(2, '0')} · Casa
                    </span>
                    <div className={styles.brandVisual}>
                      {brand.image ? (
                        <Image data={brand.image} alt="" className={styles.brandImage} sizes="120px" loading="lazy" />
                      ) : null}
                      <h3 className={styles.brandName}>{brand.name}</h3>
                    </div>
                    <div className={styles.brandFooter}>
                      <span>{brand.count} {brand.count === 1 ? 'producto' : 'productos'}</span>
                      <span className={styles.arrow} aria-hidden="true">↗</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

const BRANDS_QUERY = `#graphql
  query BrandsIndex($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 250, sortKey: TITLE) {
      nodes {
        id
        vendor
        featuredImage { id url altText width height }
      }
    }
  }
`;
