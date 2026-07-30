import { useCallback, useEffect, useState } from 'react';
import { read, write } from '../lib/storage.js';

/** useState backed by localStorage, kept in sync across every component in the tab. */
export function useLocalState(key, initial) {
  const [value, setValue] = useState(() => read(key, initial));

  useEffect(() => {
    const onChange = (e) => {
      const changed = e.detail?.key;
      if (changed === key || changed === '*') setValue(read(key, initial));
    };
    window.addEventListener('umass:storage', onChange);
    // Cross-tab edits (rare on a phone, but free to support).
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('umass:storage', onChange);
      window.removeEventListener('storage', onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        write(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}
