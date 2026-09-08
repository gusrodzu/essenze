import {Navigate, Outlet, useLocation} from 'react-router-dom';
import {useAuth} from './AuthContext';

export default function ProtectedRoute() {
  const {authenticated, loading} = useAuth();
  const location = useLocation();

  if (loading) return <div style={{display:'grid',placeItems:'center',minHeight:'100vh'}}>Cargando sesión…</div>;
  if (!authenticated) return <Navigate to="/login" replace state={{from: location}} />;
  return <Outlet />;
}
