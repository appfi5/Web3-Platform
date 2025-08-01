'use client';

import 'echarts/lib/component/tooltip';
import 'echarts-gl';

import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';

import { env } from '~/env';
import { api } from '~/trpc/react';

import { ChartColor } from './config';
import { ChartLoading, ChartThumbnail } from './SmartChartPage';

type Point = [long: number, lat: number, city: string];
const LAUNCH_TIME_OF_MAINNET = 0x16e70e6985c;

const option = {
  backgroundColor: '#000',
  tooltip: {
    show: true,
    formatter: (params: { data: Point }) => {
      return params.data[2];
    },
  },
  globe: {
    environment: '/img/chart/dark.webp',
    baseTexture: '/img/chart/earth.jpg',
    heightTexture: '/img/chart/earth.jpg',
    displacementScale: 0.04,
    displacementQuality: 'high',
    shading: 'realistic',
    realisticMaterial: {
      roughness: 0.9,
      metalness: 0,
    },
    temporalSuperSampling: {
      enable: true,
    },
    postEffect: {
      enable: true,
      depthOfField: {
        enable: false,
        focalDistance: 150,
      },
    },
    light: {
      main: {
        intensity: 10,
        shadow: true,
        time: new Date(LAUNCH_TIME_OF_MAINNET),
      },
    },
    viewControl: {
      autoRotate: true,
      autoRotateSpeed: 1,
      distance: 800,
    },
    silent: true,
  },
};

// const color = getPrimaryColor();

export const NodeGeoDistribution = ({ isThumbnail = false }: { isThumbnail?: boolean }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { data, isLoading } = api.v0.statistics.getPeers.useQuery(
    {
      network: env.NEXT_PUBLIC_IS_MAINNET ? 'minara' : 'pudge',
    },
    { enabled: !isThumbnail },
  );

  const color = ChartColor.colors[0];

  useEffect(() => {
    if (!containerRef.current) return;
    if (!data) return;
    let ins = echarts.getInstanceByDom(containerRef.current);
    if (!ins) {
      ins = echarts.init(containerRef.current);
    }

    const series = [
      {
        type: 'lines3D',
        name: 'blocks',
        coordinateSystem: 'globe',
        blendMode: 'lighter',
        symbolSize: 2,
        itemStyle: {
          color,
          opacity: 0.1,
        },
        effect: {
          show: true,
          trailWidth: 1,
          trailLength: 0.15,
          trailOpacity: 0.1,
          constantSpeed: 10,
        },
        lineStyle: {
          width: 1,
          color,
          opacity: 0.02,
        },
        data: data.lines,
      },
      {
        type: 'scatter3D',
        coordinateSystem: 'globe',
        blendMode: 'lighter',
        symbolSize: 10,
        itemStyle: {
          color,
          opacity: 0.2,
        },
        label: {
          show: true,
          formatter: '{b}',
        },
        data: data.points,
      },
    ];

    ins.setOption({
      ...option,
      series,
    });
  }, [data]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ins = echarts.getInstanceByDom(containerRef.current);
    const handleResize = () => {
      if (ins) {
        ins.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  if (isThumbnail) {
    return (
      <ChartThumbnail
        className="p-0"
        description="The distribution of nodes around the world"
        title="Node Geo Distribution"
      >
        <div
          className="bg-cover bg-center bg-no-repeat h-[200px] w-full"
          style={{
            backgroundImage: `url(/img/chart/geo_cover_${env.NEXT_PUBLIC_IS_MAINNET ? 'mainnet' : 'testnet'}.png)`,
          }}
        />
      </ChartThumbnail>
    );
  }

  if (isLoading) {
    return <ChartLoading />;
  }

  if (!data) {
    return <div>Fail to load data</div>;
  }

  return <div className="w-full h-full" ref={containerRef} />;
};

export default NodeGeoDistribution;
