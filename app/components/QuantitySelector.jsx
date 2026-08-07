import {useState} from 'react';
import styles from './QuantitySelector.module.css';

/**
 * QuantitySelector
 * Selector interactivo de cantidad con botones + y -
 * @param {{
 *   value: number;
 *   onChange: (quantity: number) => void;
 *   min?: number;
 *   max?: number;
 * }}
 */
export function QuantitySelector({value = 1, onChange, min = 1, max = 999}) {
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  return (
    <div className={styles.quantitySelector}>
      <label htmlFor="quantity" className={styles.label}>
        Cantidad
      </label>
      <div className={styles.selectorContainer}>
        <button
          type="button"
          className={styles.decreaseBtn}
          onClick={handleDecrease}
          disabled={value <= min}
          aria-label="Disminuir cantidad"
        >
          −
        </button>
        <input
          id="quantity"
          type="number"
          className={styles.input}
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          aria-label="Cantidad de producto"
        />
        <button
          type="button"
          className={styles.increaseBtn}
          onClick={handleIncrease}
          disabled={value >= max}
          aria-label="Aumentar cantidad"
        >
          +
        </button>
      </div>
    </div>
  );
}
