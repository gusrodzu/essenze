import {Link} from 'react-router';
import {useMemo, useRef} from 'react';
import estilos from './AromaticNotes.module.css';

const DEFAULT_FAMILIES = [
  {id: 'floral', label: 'Floral', handle: 'floral', description: 'Flores blancas, pétalos y bouquets luminosos'},
  {id: 'ambar', label: 'Ámbar', handle: 'ambar', description: 'Calidez, resinas y sensualidad envolvente'},
  {id: 'citrico', label: 'Cítrico', handle: 'citrico', description: 'Frescura, energía y salida brillante'},
  {id: 'frutal', label: 'Frutal', handle: 'frutal', description: 'Acordes jugosos y dulzura natural'},
  {id: 'aromatico', label: 'Aromático', handle: 'aromatico', description: 'Hierbas, lavanda y matices verdes'},
  {id: 'oriental', label: 'Oriental', handle: 'oriental', description: 'Especias, resinas y facetas opulentas'},
  {id: 'especiado', label: 'Especiado', handle: 'especiado', description: 'Especias cálidas, frescas y vibrantes'},
  {id: 'marino', label: 'Marino', handle: 'marino', description: 'Acordes acuáticos y frescura salina'},
];

const DEFAULT_IMAGES = {
  floral: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_45_04_a.m.png?v=1785429924',
  ambar: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_52_03_a.m.png?v=1785430337',
  citrico: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_02_41_a.m.png?v=1785430977',
  frutal: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_08_19_a.m.png?v=1785431328',
  aromatico: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_13_00_a.m.png?v=1785431612',
  oriental: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_15_05_a.m.png?v=1785431723',
  especiado: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_17_26_a.m.png?v=1785431866',
  marino: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_52_03_a.m.png?v=1785430337',
};

const FAMILY_TERMS = [
  'floral','ambar','amber','citr','frut','aromatic','oriental','especi','marino','acuatic',
  'amader','woody','chipre','chypre','fougere','fougère','gourmand','cuero','leather','verde',
  'almiz','musk','tabaco','tobacco','oud','vainilla','vanilla'
];

function normalize(value = '') {
  return String(value).toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isFamilyCollection(collection) {
  const value = normalize(`${collection?.title || ''} ${collection?.handle || ''}`);
  return FAMILY_TERMS.some((term) => value.includes(normalize(term)));
}

export default function AromaticNotes({collections = []}) {
  const carouselRef = useRef(null);

  const aromaticNotes = useMemo(() => {
    const byHandle = new Map();
    DEFAULT_FAMILIES.forEach((family) => byHandle.set(family.handle, family));

    collections.filter(isFamilyCollection).forEach((collection) => {
      const handle = collection.handle;
      const fallback = DEFAULT_FAMILIES.find((family) => normalize(family.handle) === normalize(handle));
      byHandle.set(handle, {
        id: handle,
        handle,
        label: collection.title,
        description: collection.description || fallback?.description || 'Explora esta familia olfativa',
        collection,
      });
    });

    return [...byHandle.values()].sort((a, b) =>
      a.label.localeCompare(b.label, 'es-MX', {sensitivity: 'base'}),
    );
  }, [collections]);

  const getImageUrl = (note) => {
    const collection = note.collection || collections.find(
      (item) => normalize(item?.handle) === normalize(note.handle),
    );
    return collection?.image?.url || DEFAULT_IMAGES[note.id] || null;
  };

  const scrollCarousel = (direction) => {
    const track = carouselRef.current;
    if (!track) return;
    track.scrollBy({left: direction === 'left' ? -350 : 350, behavior: 'smooth'});
  };

  return (
    <section id="familias-olfativas" className={estilos.section} data-motion-reveal>
      <div className={estilos.container}>
        <div className={estilos.header}>
          <div>
            <h2 className={estilos.title}>Familias olfativas</h2>
            <p className={estilos.subtitle}>
              Explora nuestras {aromaticNotes.length} familias olfativas y encuentra tu fragancia perfecta
            </p>
          </div>
        </div>

        <div className={estilos.carouselContainer}>
          <button className={`${estilos.carouselArrow} ${estilos.left}`} type="button" onClick={() => scrollCarousel('left')} aria-label="Familias anteriores">←</button>
          <div className={estilos.track} ref={carouselRef} role="region" aria-label="Carrusel de familias olfativas">
            {aromaticNotes.map((note) => {
              const imageUrl = getImageUrl(note);
              const hasCollection = collections.some((collection) => normalize(collection?.handle) === normalize(note.handle));
              const target = hasCollection ? `/collections/${note.handle}` : `/search?q=${encodeURIComponent(note.label)}`;
              return (
                <article key={note.id} className={estilos.card} data-motion-surface>
                  <Link prefetch="intent" to={target} className={estilos.cardButton} aria-label={`Explorar familia olfativa ${note.label}`}>
                    <div className={estilos.imageContainer} style={{backgroundImage: imageUrl ? `url(${imageUrl})` : undefined}}>
                      <div className={estilos.overlay} />
                      <div className={estilos.content}>
                        <h3 className={estilos.label}>{note.label}</h3>
                        <p className={estilos.description}>{note.description}</p>
                      </div>
                      <div className={estilos.hoverGlow} />
                    </div>
                    <div className={estilos.info}>
                      <span className={estilos.category}>Familia olfativa</span>
                      <span className={estilos.cta}>{note.label}</span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
          <button className={`${estilos.carouselArrow} ${estilos.right}`} type="button" onClick={() => scrollCarousel('right')} aria-label="Familias siguientes">→</button>
        </div>
      </div>
    </section>
  );
}
