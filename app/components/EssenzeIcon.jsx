const ICON_PATHS = {
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-4.1 3.1-6.2 7-6.2s6.2 2.1 7 6.2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M3.5 20c.7-3.8 2.6-5.8 5.8-5.8s5.1 2 5.8 5.8" />
      <path d="M14.8 15.4c2.9.1 4.7 1.6 5.7 4.6" />
    </>
  ),
  flower: (
    <>
      <circle cx="12" cy="12" r="2.1" />
      <path d="M12 9.7c-2.9-1.4-3.8-4-2.2-5.3 1.6-1.3 3.7.3 2.2 5.3Z" />
      <path d="M14.2 11.3c1-3 3.4-4.2 4.9-2.8 1.5 1.4.2 3.7-4.9 2.8Z" />
      <path d="M13.4 14c3.2.4 4.8 2.5 3.7 4.2-1.1 1.7-3.7.9-3.7-4.2Z" />
      <path d="M10.4 14c-.6 3.2-2.9 4.5-4.4 3.2-1.5-1.3-.4-3.8 4.4-3.2Z" />
      <path d="M9.7 11c-3.1.9-5.4-.5-4.8-2.5.6-2 3.3-2.3 4.8 2.5Z" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M8 3v4M16 3v4M4 9h16" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 2.8c.7 3.2 2.5 5 5.7 5.7-3.2.7-5 2.5-5.7 5.7-.7-3.2-2.5-5-5.7-5.7 3.2-.7 5-2.5 5.7-5.7Z" />
      <path d="M18.5 14.5c.4 1.8 1.4 2.8 3.2 3.2-1.8.4-2.8 1.4-3.2 3.2-.4-1.8-1.4-2.8-3.2-3.2 1.8-.4 2.8-1.4 3.2-3.2Z" />
      <path d="M5 15.5c.3 1.2 1 1.9 2.2 2.2-1.2.3-1.9 1-2.2 2.2-.3-1.2-1-1.9-2.2-2.2 1.2-.3 1.9-1 2.2-2.2Z" />
    </>
  ),
  wand: (
    <>
      <path d="m5 19 10.5-10.5" />
      <path d="m13.8 6.2 4 4" />
      <path d="M6 4v3M4.5 5.5h3M19 14v4M17 16h4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.2c0 4.5 2.7 7.7 7 9.8 4.3-2.1 7-5.3 7-9.8V6l-7-3Z" />
      <path d="m8.8 12 2.1 2.1 4.5-4.5" />
    </>
  ),
  package: (
    <>
      <path d="m4 7 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7M12 11v10" />
      <path d="m8 5 8 4" />
    </>
  ),
  headset: (
    <>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <path d="M4 13h3v6H5.5A1.5 1.5 0 0 1 4 17.5V13ZM20 13h-3v6h1.5a1.5 1.5 0 0 0 1.5-1.5V13Z" />
      <path d="M17 19c-.8 1.2-2.1 2-4 2" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  building: (
    <>
      <path d="M5 21V6l7-3 7 3v15" />
      <path d="M3 21h18M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
    </>
  ),
  compare: (
    <>
      <path d="M8 4 4 8l4 4M4 8h13" />
      <path d="m16 20 4-4-4-4M20 16H7" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  fingerprint: (
    <>
      <path d="M7 10.5a5 5 0 0 1 10 0c0 4.8-1 7.3-2.7 10" />
      <path d="M9.3 12c0-3.5 5.4-3.5 5.4 0 0 3.6-.5 6-1.7 8.5" />
      <path d="M6.2 14.5c.2 2.7-.2 4.4-1 6M17.8 14.5c-.1 2.2.4 4 1.2 5.5" />
      <path d="M4.5 11.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  sunMoon: (
    <>
      <circle cx="8" cy="9" r="3.2" />
      <path d="M8 3V1.8M8 16.2V15M2 9H.8M15.2 9H14M3.8 4.8 3 4M13 14l-.8-.8M12.2 4.8 13 4M3 14l.8-.8" />
      <path d="M20.5 12.5a5.7 5.7 0 0 1-7.8 7.8 6.2 6.2 0 0 0 7.8-7.8Z" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  bottle: (
    <>
      <path d="M9 3h6v4H9zM10 7h4" />
      <path d="M8 8h8l2 3v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8l2-3Z" />
      <path d="M8 14h8M9.5 17h5" />
    </>
  ),
  droplet: (
    <path d="M12 2.8s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
  ),
  leaf: (
    <>
      <path d="M20 4C11 4 5 7.7 5 14c0 3.4 2.2 6 5.5 6 6.2 0 9.5-7 9.5-16Z" />
      <path d="M4 21c2.3-5.4 6.1-8.8 12-11" />
    </>
  ),
  citrus: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m12 12 5.8-5.8M12 12l-5.8-5.8M12 12v8.5M12 12H3.5M12 12h8.5" />
      <circle cx="12" cy="12" r="1.3" />
    </>
  ),
  flame: (
    <path d="M13.5 2.5c.7 4-2.4 5.1-1.5 8.1 1.6-1.1 2.5-2.4 2.6-4.1 3.4 2.6 4.4 5.5 3.2 8.7A6.2 6.2 0 0 1 12 21a6.4 6.4 0 0 1-6.2-6.5c0-3.5 2.2-6 5.7-9.1.1 2.6.7 4 2 5.2" />
  ),
  gift: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="1.5" />
      <path d="M12 9v12M3 13h18M7.5 9C5 9 4 7.7 4 6.2S5.2 4 6.6 4C9 4 12 9 12 9M16.5 9c2.5 0 3.5-1.3 3.5-2.8S18.8 4 17.4 4C15 4 12 9 12 9" />
    </>
  ),
  heart: (
    <path d="M20.4 5.7c-2-2-5.2-1.9-7.1.1L12 7.1l-1.3-1.3c-1.9-2-5.1-2.1-7.1-.1-2.1 2.1-2 5.6.2 7.7L12 21l8.2-7.6c2.2-2.1 2.3-5.6.2-7.7Z" />
  ),
  diamond: (
    <>
      <path d="m4 8 4-5h8l4 5-8 13L4 8Z" />
      <path d="M4 8h16M8 3l4 5 4-5M12 8v13" />
    </>
  ),
  notes: (
    <>
      <path d="M9 5v11.5a3 3 0 1 1-2-2.8V7l10-2v9.5a3 3 0 1 1-2-2.8V3L9 5Z" />
    </>
  ),
  star: (
    <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21M12 3C9.6 5.5 8.4 8.5 8.4 12S9.6 18.5 12 21" />
    </>
  ),
};

export default function EssenzeIcon({
  name = 'sparkles',
  size = 22,
  strokeWidth = 1.55,
  className,
  ...props
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {ICON_PATHS[name] || ICON_PATHS.sparkles}
    </svg>
  );
}

export function getContextIconName(label = '') {
  const value = String(label)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/floral|flor|rosa|jazmin/.test(value)) return 'flower';
  if (/citric|limon|naranja|bergamota|mandarina/.test(value)) return 'citrus';
  if (/madera|amader|oud|cedro|sandalo|verde|herbal|aromatic/.test(value)) return 'leaf';
  if (/vela|fuego|calido/.test(value)) return 'flame';
  if (/marca|maison|casa|proveedor/.test(value)) return 'building';
  if (/compar|diferencia|alternativa/.test(value)) return 'compare';
  if (/identidad|genero|sexo|perfil|persona/.test(value)) return 'fingerprint';
  if (/momento|ocasion|temporada|dia|noche|uso/.test(value)) return 'sunMoon';
  if (/mapa|ruta|guia/.test(value)) return 'map';
  if (/nota|acorde|olfativ|composicion/.test(value)) return 'notes';
  if (/intensidad|duracion|proyeccion/.test(value)) return 'droplet';
  if (/recomend|asesor|personaliz/.test(value)) return 'sparkles';
  if (/forma|frasco|dispensador|perfume|fragancia/.test(value)) return 'bottle';
  if (/envio|empaque|regalo/.test(value)) return 'package';
  if (/pago|segur|proteccion/.test(value)) return 'shield';
  if (/atencion|soporte|contacto/.test(value)) return 'headset';
  if (/coleccion|catalogo|biblioteca/.test(value)) return 'layers';
  if (/nicho|autor|exclusiv|premium/.test(value)) return 'diamond';
  return 'sparkles';
}

export function getCollectionIconName(title = '') {
  return getContextIconName(title);
}
