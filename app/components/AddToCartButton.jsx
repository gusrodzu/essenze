import {CartForm} from '@shopify/hydrogen';
import styles from './AddToCartButton.module.css';

/**
 * AddToCartButton
 * Botón para agregar productos al carrito
 * @param {{
 *   children: React.ReactNode;
 *   lines?: CartForm.OptimisticCartLineInput[];
 *   quantity?: number;
 *   disabled?: boolean;
 *   onClick?: () => void;
 * }}
 */
export function AddToCartButton({
  children,
  lines = [],
  quantity = 1,
  disabled = false,
  onClick,
}) {
  // Ajustar quantity en las líneas
  const adjustedLines = lines.map((line) => ({
    ...line,
    quantity: quantity || 1,
  }));

  return (
    <CartForm
      route="/cart"
      inputs={{
        lines: adjustedLines.length > 0 ? adjustedLines : [],
      }}
      action={CartForm.ACTIONS.LinesAdd}
    >
      {(fetcher) => (
        <button
          type="submit"
          onClick={onClick}
          disabled={disabled || fetcher.state !== 'idle'}
          className={styles.addToCartBtn}
        >
          {fetcher.state !== 'idle' ? 'Agregando...' : children}
        </button>
      )}
    </CartForm>
  );
}

export default AddToCartButton;
