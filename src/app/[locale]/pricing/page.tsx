import { ShootingStars } from '~/components/ui/shooting-stars';
import { StarsBackground } from '~/components/ui/stars-background';

import Banner from './banner';
import FAQ from './faq';
import Plans from './plans';

export const dynamic = 'force-dynamic';

export default function Pricing() {
  return (
    <div className="max-w-7xl mx-auto px-3 my-9 lg:px-10 lg:my-16">
      <ShootingStars className="fixed w-full h-full -z-10" />
      <StarsBackground className="fixed w-full h-[300px] inset-auto left-0 bottom-0 -z-10" starDensity={0.0015} />
      <StarsBackground className="fixed w-full h-[300px] -z-10" starDensity={0.0015} />
      <Banner />
      <Plans />
      <FAQ />
    </div>
  );
}
