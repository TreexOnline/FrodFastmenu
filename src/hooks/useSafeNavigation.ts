import { useNavigate } from 'react-router-dom';

export const useSafeNavigation = () => {
  const navigate = useNavigate();
  
  const safeNavigate = (path: string, options?: any) => {
    const validRoutes = [
      '/', '/auth', '/dashboard', '/checkout', 
      '/payment/success', '/payment/failed',
      '/menu/:slug', '/admin'
    ];
    
    const isRouteValid = validRoutes.some(route => 
      route.includes(':') 
        ? path.startsWith(route.split(':')[0])
        : path === route
    );
    
    if (!isRouteValid) {
      console.error(`Navigation blocked: Invalid route "${path}"`);
      return;
    }
    
    navigate(path, options);
  };
  
  return { navigate: safeNavigate };
};
