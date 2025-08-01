import { useMediaQuery } from '@uidotdev/usehooks';

export const useIsMobile = () => {
  return useMediaQuery("only screen and (max-width : 900px)")
}