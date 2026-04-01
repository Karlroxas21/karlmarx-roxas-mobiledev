import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function useAppState(onChange: (status: AppStateStatus) => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      onChangeRef.current(status);
    });
    return () => subscription.remove();
  }, []);
}
