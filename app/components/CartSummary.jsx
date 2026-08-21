import {CartForm, Money} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import styles from './CartSummary.module.css';

/**
 * @param {CartSummaryProps}
 */
export function CartSummary({cart, layout}) {
  const summaryClassName =
    layout === 'page' ? styles.cartSummaryPage : styles.cartSummaryAside;
  
  const baseClassName = styles.cartSummaryBase;
  const className = `${baseClassName} ${summaryClassName}`;
  
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();
  const giftCardHeadingId = useId();
  const giftCardInputId = useId();

  return (
    <div aria-labelledby={summaryId} className={className}>
      <h4 id={summaryId}>Totales</h4>
      
      <dl role="group" className={styles.cartSubtotal}>
        <dt>Subtotal</dt>
        <dd>
          {cart?.cost?.subtotalAmount?.amount ? (
            <Money data={cart?.cost?.subtotalAmount} />
          ) : (
            '-'
          )}
        </dd>
      </dl>

      <CartDiscounts
        discountCodes={cart?.discountCodes}
        discountsHeadingId={discountsHeadingId}
        discountCodeInputId={discountCodeInputId}
      />
      
      <CartGiftCard
        giftCardCodes={cart?.appliedGiftCards}
        giftCardHeadingId={giftCardHeadingId}
        giftCardInputId={giftCardInputId}
      />

      <dl role="group" className={styles.cartTotal}>
        <dt>Total</dt>
        <dd>
          {cart?.cost?.totalAmount?.amount ? (
            <Money data={cart?.cost?.totalAmount} />
          ) : (
            '-'
          )}
        </dd>
      </dl>

      <CartCheckoutActions checkoutUrl={cart?.checkoutUrl} />
    </div>
  );
}

/**
 * @param {{checkoutUrl?: string}}
 */
function CartCheckoutActions({checkoutUrl}) {
  if (!checkoutUrl) return null;

  return (
    <div className={styles.checkoutActions}>
      <a href={checkoutUrl} className={`${styles.checkoutLink} ${styles.checkoutBtn}`}>
        Continuar al pago <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

/**
 * @param {{
 *   discountCodes?: CartApiQueryFragment['discountCodes'];
 *   discountsHeadingId: string;
 *   discountCodeInputId: string;
 * }}
 */
function CartDiscounts({
  discountCodes,
  discountsHeadingId,
  discountCodeInputId,
}) {
  const codes =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    <section aria-label="Descuentos" className={styles.discountsSection}>
      {/* Have existing discount, display it with a remove option */}
      <div hidden={!codes.length}>
        <h5 id={discountsHeadingId} className={styles.discountsHeading}>
          Descuentos Aplicados
        </h5>
        <UpdateDiscountForm>
          <div className={styles.cartDiscount}>
            <code className={styles.discountCode}>{codes?.join(', ')}</code>
            <button 
              type="submit" 
              aria-label="Remover descuento"
              className={styles.discountRemoveBtn}
            >
              Remover
            </button>
          </div>
        </UpdateDiscountForm>
      </div>

      {/* Show an input to apply a discount */}
      <UpdateDiscountForm discountCodes={codes}>
        <div className={styles.discountCodeForm}>
          <label htmlFor={discountCodeInputId} className={styles.srOnly}>
            Código de descuento
          </label>
          <input
            id={discountCodeInputId}
            type="text"
            name="discountCode"
            placeholder="Código de descuento"
            className={styles.discountCodeInput}
          />
          <button 
            type="submit" 
            aria-label="Aplicar código de descuento"
            className={styles.discountCodeBtn}
          >
            Aplicar
          </button>
        </div>
      </UpdateDiscountForm>
    </section>
  );
}

/**
 * @param {{
 *   discountCodes?: string[];
 *   children: React.ReactNode;
 * }}
 */
function UpdateDiscountForm({discountCodes, children}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {children}
    </CartForm>
  );
}

/**
 * @param {{
 *   giftCardCodes: CartApiQueryFragment['appliedGiftCards'] | undefined;
 *   giftCardHeadingId: string;
 *   giftCardInputId: string;
 * }}
 */
function CartGiftCard({giftCardCodes, giftCardHeadingId, giftCardInputId}) {
  const giftCardCodeInput = useRef(null);
  const removeButtonRefs = useRef(new Map());
  const previousCardIdsRef = useRef([]);
  const giftCardAddFetcher = useFetcher({key: 'gift-card-add'});
  const [removedCardIndex, setRemovedCardIndex] = useState(null);

  useEffect(() => {
    if (giftCardAddFetcher.data) {
      if (giftCardCodeInput.current !== null) {
        giftCardCodeInput.current.value = '';
      }
    }
  }, [giftCardAddFetcher.data]);

  useEffect(() => {
    const currentCardIds = giftCardCodes?.map((card) => card.id) || [];

    if (removedCardIndex !== null && giftCardCodes) {
      const focusTargetIndex = Math.min(
        removedCardIndex,
        giftCardCodes.length - 1,
      );
      const focusTargetCard = giftCardCodes[focusTargetIndex];
      const focusButton = focusTargetCard
        ? removeButtonRefs.current.get(focusTargetCard.id)
        : null;

      if (focusButton) {
        focusButton.focus();
      } else if (giftCardCodeInput.current) {
        giftCardCodeInput.current.focus();
      }

      setRemovedCardIndex(null);
    }

    previousCardIdsRef.current = currentCardIds;
  }, [giftCardCodes, removedCardIndex]);

  const handleRemoveClick = (cardId) => {
    const index = previousCardIdsRef.current.indexOf(cardId);
    if (index !== -1) {
      setRemovedCardIndex(index);
    }
  };

  return (
    <section aria-label="Gift cards" className={styles.giftCardSection}>
      {giftCardCodes && giftCardCodes.length > 0 && (
        <div>
          <h5 id={giftCardHeadingId} className={styles.giftCardHeading}>
            Tarjetas de Regalo Aplicadas
          </h5>
          {giftCardCodes.map((giftCard) => (
            <div key={giftCard.id} className={styles.giftCardItem}>
              <RemoveGiftCardForm
                giftCardId={giftCard.id}
                lastCharacters={giftCard.lastCharacters}
                onRemoveClick={() => handleRemoveClick(giftCard.id)}
                buttonRef={(el) => {
                  if (el) {
                    removeButtonRefs.current.set(giftCard.id, el);
                  } else {
                    removeButtonRefs.current.delete(giftCard.id);
                  }
                }}
              >
                <code className={styles.giftCardCode}>***{giftCard.lastCharacters}</code>
                <span className={styles.giftCardAmount}>
                  <Money data={giftCard.amountUsed} />
                </span>
              </RemoveGiftCardForm>
            </div>
          ))}
        </div>
      )}

      <AddGiftCardForm fetcherKey="gift-card-add">
        <div className={styles.giftCardForm}>
          <label htmlFor={giftCardInputId} className={styles.srOnly}>
            Código de tarjeta de regalo
          </label>
          <input
            id={giftCardInputId}
            type="text"
            name="giftCardCode"
            placeholder="Código de tarjeta de regalo"
            ref={giftCardCodeInput}
            className={styles.giftCardInput}
          />
          <button
            type="submit"
            disabled={giftCardAddFetcher.state !== 'idle'}
            aria-label="Aplicar código de tarjeta de regalo"
            className={styles.giftCardBtn}
          >
            Aplicar
          </button>
        </div>
      </AddGiftCardForm>
    </section>
  );
}

/**
 * @param {{
 *   fetcherKey?: string;
 *   children: React.ReactNode;
 * }}
 */
function AddGiftCardForm({fetcherKey, children}) {
  return (
    <CartForm
      fetcherKey={fetcherKey}
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesAdd}
    >
      {children}
    </CartForm>
  );
}

/**
 * @param {{
 *   giftCardId: string;
 *   lastCharacters: string;
 *   children: React.ReactNode;
 *   onRemoveClick?: () => void;
 *   buttonRef?: (el: HTMLButtonElement | null) => void;
 * }}
 */
function RemoveGiftCardForm({
  giftCardId,
  lastCharacters,
  children,
  onRemoveClick,
  buttonRef,
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesRemove}
      inputs={{
        giftCardCodes: [giftCardId],
      }}
    >
      <div className={styles.giftCardRow}>
        {children}
        <button
          type="submit"
          aria-label={`Remover tarjeta de regalo que termina en ${lastCharacters}`}
          onClick={onRemoveClick}
          ref={buttonRef}
          className={styles.discountRemoveBtn}
        >
          Remover
        </button>
      </div>
    </CartForm>
  );
}

/**
 * @typedef {{
 *   cart: OptimisticCart<CartApiQueryFragment | null>;
 *   layout: CartLayout;
 * }} CartSummaryProps
 */

/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('~/components/CartMain').CartLayout} CartLayout */
/** @typedef {import('@shopify/hydrogen').OptimisticCart} OptimisticCart */
