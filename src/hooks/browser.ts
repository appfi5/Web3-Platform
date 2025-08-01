import { useEffect, useState } from 'react';

function useClientMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean>(false)

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query)

    const handleMatchChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    mediaQueryList.addEventListener('change', handleMatchChange)
    setMatches(mediaQueryList.matches)

    return () => {
      mediaQueryList.removeEventListener('change', handleMatchChange)
    }
  }, [query])

  return matches
}

export const useIsMobile = () => {
  return useClientMediaQuery('only screen and (max-width : 900px)');
};
