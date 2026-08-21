import {Link, useNavigate} from 'react-router';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';

const OPTION_LABELS = {
  size: 'Tamaño',
  taille: 'Tamaño',
  tamano: 'Tamaño',
  tamaño: 'Tamaño',
  volume: 'Volumen',
  volumen: 'Volumen',
  color: 'Color',
  scent: 'Aroma',
  fragrance: 'Fragancia',
  concentracion: 'Concentración',
  concentración: 'Concentración',
};

export function ProductForm({productOptions, selectedVariant}) {
  const navigate = useNavigate();
  const {open} = useAside();
  const visibleOptions = productOptions.filter((option) => option.optionValues.length > 1);

  return (
    <div className="product-form">
      {visibleOptions.map((option) => (
        <div className="product-options" key={option.name}>
          <div className="product-option-heading">
            <h5>{formatProductOptionName(option.name)}</h5>
            <span>Selecciona una opción</span>
          </div>
          <div className="product-options-grid" role="group" aria-label={formatProductOptionName(option.name)}>
            {option.optionValues.map((value) => {
              const {name,handle,variantUriQuery,selected,available,exists,isDifferentProduct,swatch}=value;
              const className=`product-options-item${selected?' is-selected':''}${!available?' is-unavailable':''}`;
              if (isDifferentProduct) {
                return (
                  <Link className={className} key={option.name+name} prefetch="intent" preventScrollReset replace to={`/products/${handle}?${variantUriQuery}`} aria-current={selected?'true':undefined} aria-label={`${formatProductOptionName(option.name)}: ${name}${!available?', no disponible':''}`}>
                    <ProductOptionSwatch swatch={swatch} name={name}/>
                  </Link>
                );
              }
              return (
                <button type="button" className={className} key={option.name+name} disabled={!exists} aria-pressed={selected} aria-label={`${formatProductOptionName(option.name)}: ${name}${!available?', no disponible':''}`} onClick={()=>{if(!selected) void navigate(`?${variantUriQuery}`,{replace:true,preventScrollReset:true});}}>
                  <ProductOptionSwatch swatch={swatch} name={name}/>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <AddToCartButton disabled={!selectedVariant||!selectedVariant.availableForSale} onClick={()=>open('cart')} lines={selectedVariant?[{merchandiseId:selectedVariant.id,quantity:1,selectedVariant}]:[]}>
        {selectedVariant?.availableForSale?'Agregar al carrito':'Agotado'}
      </AddToCartButton>
      <p className="product-purchase-note">Pago protegido · Envío rastreable · Atención personalizada</p>
    </div>
  );
}

function formatProductOptionName(name='') {
  const key=name.trim().toLocaleLowerCase('es-MX');
  return OPTION_LABELS[key] || name;
}

function ProductOptionSwatch({swatch,name}) {
  const image=swatch?.image?.previewImage?.url; const color=swatch?.color;
  if(!image&&!color) return <span className="product-option-value">{name}</span>;
  return <span className="product-option-swatch-wrap"><span aria-hidden="true" className="product-option-label-swatch" style={{backgroundColor:color||'transparent'}}>{image?<img src={image} alt=""/>:null}</span><span className="product-option-value">{name}</span></span>;
}
/** @typedef {import('@shopify/hydrogen').MappedProductOptions} MappedProductOptions */
