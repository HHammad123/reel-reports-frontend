import { useEffect, useState } from 'react'

export default function useScriptGeneratedFlag() {
  const getInitial = () => {
    try {
      return (
        localStorage.getItem('has_generated_script') === 'true' ||
        !!localStorage.getItem('last_generated_script')
      );
    } catch {
      return false;
    }
  };

  const [hasGenerated, setHasGenerated] = useState(getInitial);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e || !e.key) return;
      if (e.key === 'has_generated_script' || e.key === 'last_generated_script') {
        setHasGenerated(getInitial());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return hasGenerated;
}


