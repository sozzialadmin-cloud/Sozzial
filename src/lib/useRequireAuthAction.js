import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export function useRequireAuthAction() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return function requireAuth(callback) {
    if (isAuthenticated) {
      callback();
      return;
    }
    const next = encodeURIComponent(location.pathname + location.search);
    navigate(`/auth?next=${next}`);
  };
}

