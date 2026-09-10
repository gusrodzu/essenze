import {Link} from 'react-router';
import {useMemo, useRef} from 'react';
import estilos from './AromaticNotes.module.css';

const DEFAULT_FAMILIES = [
  {id: 'citrica', label: 'Cítrica', handle: 'citrica', aliases: ['citrica', 'citrico', 'citrus'], description: 'Frescura brillante de cítricos, bergamota, limón y mandarina'},
  {id: 'acuatica', label: 'Acuática', handle: 'acuatica', aliases: ['acuatica', 'acuatico', 'marino', 'marina', 'aquatic'], description: 'Acordes acuáticos, limpios y de frescura salina'},
  {id: 'aromatica', label: 'Aromática', handle: 'aromatica', aliases: ['aromatica', 'aromatico', 'aromatic'], description: 'Hierbas, lavanda, verdes y matices frescos'},
  {id: 'frutal', label: 'Frutal', handle: 'frutal', aliases: ['frutal', 'fruity'], description: 'Acordes jugosos, pulpa fresca y dulzura natural'},
  {id: 'floral', label: 'Floral', handle: 'floral', aliases: ['floral'], description: 'Flores blancas, pétalos y bouquets luminosos'},
  {id: 'chipre', label: 'Chipre', handle: 'chipre', aliases: ['chipre', 'chypre'], description: 'Contrastes elegantes entre cítricos, flores, musgos y maderas'},
  {id: 'amaderada', label: 'Amaderada', handle: 'amaderada', aliases: ['amaderada', 'amaderado', 'woody'], description: 'Maderas secas, cremosas, especiadas y de gran profundidad'},
  {id: 'ambar', label: 'Ámbar', handle: 'ambar', aliases: ['ambar', 'amber'], description: 'Calidez, resinas y sensualidad envolvente'},
  {id: 'gourmand', label: 'Gourmand', handle: 'gourmand', aliases: ['gourmand'], description: 'Facetas golosas como vainilla, cacao, caramelo y café'},
  {id: 'cuero', label: 'Cuero', handle: 'cuero', aliases: ['cuero', 'leather'], description: 'Acordes profundos, ahumados y elegantes inspirados en cuero'},
];

const DEFAULT_IMAGES = {
  citrica: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_02_41_a.m.png?v=1785430977',
  acuatica: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_52_03_a.m.png?v=1785430337',
  aromatica: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_13_00_a.m.png?v=1785431612',
  frutal: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_08_19_a.m.png?v=1785431328',
  floral: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_45_04_a.m.png?v=1785429924',
  chipre: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_17_26_a.m.png?v=1785431866',
  amaderada: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_17_26_a.m.png?v=1785431866',
  ambar: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_10_52_03_a.m.png?v=1785430337',
  gourmand: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_08_19_a.m.png?v=1785431328',
  cuero: 'https://cdn.shopify.com/s/files/1/0840/5526/1218/files/ChatGPT_Image_30_jul_2026_11_15_05_a.m.png?v=1785431723',
};

const FAMILY_TERMS = DEFAULT_FAMILIES.flatMap((family) => family.aliases);

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
    return DEFAULT_FAMILIES.map((family) => {
      const collection = collections.find((item) => {
        const value = normalize(`${item?.title || ''} ${item?.handle || ''}`);
        return family.aliases.some((alias) => value.includes(normalize(alias)));
      });

      return {
        ...family,
        handle: collection?.handle || family.handle,
        description: collection?.description || family.description,
        collection,
      };
    });
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
              const target = note.collection ? `/collections/${note.collection.handle}` : `/search?q=${encodeURIComponent(note.label)}`;
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
