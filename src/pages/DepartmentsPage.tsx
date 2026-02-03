import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DepartmentsManagement } from '../components/DepartmentsManagement';
import type { DashboardLayoutContext } from '../components/DashboardLayout';

export function DepartmentsPage() {
  const { store, refetch } = useOutletContext<DashboardLayoutContext>();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    refetchRef.current?.();
  }, []);

  return <DepartmentsManagement store={store} refetch={refetch} />;
}
