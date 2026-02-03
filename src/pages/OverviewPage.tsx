import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { StatsOverview } from '../components/StatsOverview';
import type { DashboardLayoutContext } from '../components/DashboardLayout';

export function OverviewPage() {
  const { user, store, refetch } = useOutletContext<DashboardLayoutContext>();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    refetchRef.current?.();
  }, []);

  return <StatsOverview store={store} user={user} />;
}
