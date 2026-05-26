// Bu sayfa artık DashboardPage içindeki modal akışıyla ikincil konumda.
// Direkt URL ile erişim için fallback olarak çalışır.
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function MatchPage() {
  const { skillId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Eşleşme akışı artık Dashboard'dan yönetiliyor
    navigate('/dashboard');
  }, []);

  return null;
}
