import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DailyLogView } from '../components/DailyLogView';
import type { DashboardLayoutContext } from '../components/DashboardLayout';

export function DailyLogPage() {
  const { user, store, refetch } = useOutletContext<DashboardLayoutContext>();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    refetchRef.current?.();
  }, []);

  return <DailyLogView store={store} user={user} refetch={refetch} />;
}
