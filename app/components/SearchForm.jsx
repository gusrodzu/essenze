import {useEffect, useRef} from 'react';
import {Form} from 'react-router';
import styles from './SearchForm.module.css';

export function SearchForm({children, className, ...props}) {
  const inputRef = useRef(null);

  useFocusOnSearchShortcut(inputRef);

  if (typeof children !== 'function') return null;

  return (
    <Form method="get" className={className || styles.searchForm} {...props}>
      {children({inputRef})}
    </Form>
  );
}

function useFocusOnSearchShortcut(inputRef) {
  useEffect(() => {
    function handleKeyDown(event) {
      const isSearchShortcut =
        event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);

      if (isSearchShortcut) {
        event.preventDefault();
        inputRef.current?.focus({preventScroll: true});
        inputRef.current?.select?.();
      }

      if (
        event.key === 'Escape' &&
        document.activeElement === inputRef.current
      ) {
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [inputRef]);
}

/** @typedef {import('react-router').FormProps} FormProps */
