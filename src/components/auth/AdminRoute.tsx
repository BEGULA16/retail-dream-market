
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Outlet } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const AdminRoute = () => {
  const { profile, isLoadingProfile } = useAuth();

  if (isLoadingProfile) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="w-full max-w-4xl space-y-4 p-4">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-16 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
