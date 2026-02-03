import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { SettingsPanel } from '../components/SettingsPanel';
import type { DashboardLayoutContext } from '../components/DashboardLayout';

export function SettingsPage() {
  const { store, refetch } = useOutletContext<DashboardLayoutContext>();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    refetchRef.current?.();
  }, []);

  return <SettingsPanel store={store} />;
}
