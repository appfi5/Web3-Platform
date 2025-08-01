'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

const Hero = () => {
  const t = useTranslations('AboutUsPage');
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setMousePosition({ x: window.innerWidth / 2, y: 0 });
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="w-full mt-10 md:mt-0 md:w-[750px] md:flex-[0_0_744px] flex flex-col items-center justify-center gap-14 overflow-hidden mb-8 border-none">
      {mousePosition && (
        <div
          className="w-[50vw] h-[200px] inset-0 absolute blur-[100px]"
          style={{
            backgroundImage: `radial-gradient(rgba(197, 227, 33, 0.5), rgba(197, 227, 33, 0))`,
            transform: `translate3d(calc(${mousePosition.x}px - 50%),0, 0)`,
            transition: 'all 450ms ease-out',
          }}
        />
      )}

      <div className="w-full flex flex-col items-center justify-center gap-6 md:gap-12">
        <h1 className="w-fit font-semibold text-primary text-2xl text-center">{t('heroTitle')}</h1>

        <p className="w-full px-5 md:px-0 text-neutral-50 text-sm">{t('description')}</p>
      </div>

      <video autoPlay className="w-full h-auto object-cover" loop muted src="/video/aboutus/p-1.mp4" />
    </section>
  );
};

export default Hero;
