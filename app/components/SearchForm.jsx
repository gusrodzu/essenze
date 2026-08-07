import {useRef, useEffect} from 'react';
import {Form} from 'react-router';
import styles from './SearchForm.module.css';

/**
 * Search form component that sends search requests to the `/search` route.
 * @example
 * ```tsx
 * <SearchForm>
 *  {({inputRef}) => (
 *    <>
 *      <div className={styles.searchInputWrapper}>
 *        <input
 *          ref={inputRef}
 *          type="search"
 *          defaultValue={term}
 *          name="q"
 *          placeholder="Buscar productos..."
 *          className={styles.searchInput}
 *        />
 *      </div>
 *      <button type="submit" className={styles.searchButton}>
 *        Buscar
 *      </button>
 *   </>
 *  )}
 *  </SearchForm>
 * @param {SearchFormProps}
 */
export function SearchForm({children, className, ...props}) {
  const inputRef = useRef(null);

  useFocusOnCmdK(inputRef);

  if (typeof children !== 'function') {
    return null;
  }

  return (
    <Form 
      method="get" 
      className={className ? className : styles.searchForm}
      {...props}
    >
      {children({inputRef})}
    </Form>
  );
}

/**
 * Focuses the input when cmd+k is pressed
 * @param {React.RefObject<HTMLInputElement>} inputRef
 */
function useFocusOnCmdK(inputRef) {
  // focus the input when cmd+k is pressed
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'k' && event.metaKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === 'Escape') {
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputRef]);
}

/**
 * @typedef {Omit<FormProps, 'children'> & {
 *   children: (args: {
 *     inputRef: React.RefObject<HTMLInputElement>;
 *   }) => React.ReactNode;
 * }} SearchFormProps
 */

/** @typedef {import('react-router').FormProps} FormProps */