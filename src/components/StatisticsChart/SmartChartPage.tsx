'use client';

import 'echarts/lib/chart/line';
import 'echarts/lib/chart/bar';
import 'echarts/lib/chart/pie';
import 'echarts/lib/chart/map';
import 'echarts/lib/chart/scatter';
import 'echarts/lib/component/tooltip';
import 'echarts/lib/component/title';
import 'echarts/lib/component/legend';
import 'echarts/lib/component/markLine';
import 'echarts/lib/component/dataZoom';
import 'echarts/lib/component/brush';
import 'echarts/lib/component/visualMap';

import { usePrevious } from '@uidotdev/usehooks';
import dayjs from 'dayjs';
import { type ECharts, type EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import { Columns2Icon, DownloadIcon, HelpCircleIcon, Rows2Icon } from 'lucide-react';
import Image from 'next/image';
import {
  type ComponentProps,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isDeepEqual } from 'remeda';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

const ReactChartCore = ({
  option: _option,
  isThumbnail,
  onClick,
  notMerge = false,
  lazyUpdate = false,
  style,
  className = '',
  scale = {},
}: {
  option: EChartsOption;
  isThumbnail?: boolean;
  onClick?: (param: echarts.ECElementEvent) => void;
  notMerge?: boolean;
  lazyUpdate?: boolean;
  style?: CSSProperties;
  className?: string;
  scale?: {
    enable?: boolean;
    initialScaleType?: string;
  };
}) => {
  const { enable: scaleEnable = false, initialScaleType = 'log' } = scale;
  const [scaleType, setScaleType] = useState<string>(initialScaleType);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ECharts | null>(null);
  const option = useMemo(() => {
    if (!scale.enable) return _option;

    const overrideYAxis: (option: echarts.YAXisComponentOption) => echarts.YAXisComponentOption = (opt) => ({
      ...opt,
      name: opt?.name === '' ? '' : `${opt?.name}${scaleType === 'log' ? ' (Log)' : ''}`,
      ...(scaleType === 'log'
        ? {
            type: 'log',
            logBase: 10,
          }
        : {}),
    });

    return {
      ..._option,
      yAxis: Array.isArray(_option.yAxis)
        ? [_option.yAxis[0] ? overrideYAxis(_option.yAxis[0]) : _option.yAxis[0], ..._option.yAxis.slice(1)]
        : _option.yAxis
          ? overrideYAxis(_option.yAxis)
          : _option.yAxis,
    } as EChartsOption;
  }, [_option, scale, scaleType]);
  const prevOption = usePrevious(option);
  const prevClickEvent = usePrevious(onClick);

  useEffect(() => {
    if (!chartRef.current) return;

    let chartInstance: ECharts | null = null;

    if (!chartInstanceRef.current) {
      const renderedInstance = echarts.getInstanceByDom(chartRef.current);
      if (renderedInstance) {
        renderedInstance.dispose();
      }
      chartInstanceRef.current = echarts.init(chartRef.current, 'dark');
    }

    chartInstance = chartInstanceRef.current;
    try {
      if (!isDeepEqual(prevOption, option)) {
        chartInstance.setOption(option, { notMerge, lazyUpdate });
      }
      if (onClick && typeof onClick === 'function' && onClick !== prevClickEvent) {
        chartInstance.on('click', onClick);
      }
    } catch (error) {
      console.error('error', error);
      if (chartInstance) {
        chartInstance.dispose();
      }
    }
  }, [onClick, lazyUpdate, notMerge, option, prevClickEvent, prevOption]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      chartInstanceRef.current?.resize();
    });

    if (chartRef.current) {
      observer.observe(chartRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [chartInstanceRef, chartRef]);

  return (
    <div className={cn('bg-accent rounded-lg relative', className)}>
      <div ref={chartRef} style={{ height: isThumbnail ? '200px' : '70vh', ...style }} />
      {!isThumbnail && scaleEnable && (
        <RadioGroup
          className="absolute gap-2 top-4 -translate-x-2/4 left-2/4"
          onValueChange={(value) => setScaleType(value as 'linear' | 'log')}
          value={scaleType}
        >
          <div className="flex items-center space-x-2 cursor-pointer">
            <RadioGroupItem id="linear" value="linear" />
            <Label className="cursor-pointer" htmlFor="linear">
              Linear Scale
            </Label>
          </div>
          <div className="flex items-center space-x-2 cursor-pointer">
            <RadioGroupItem id="log" value="log" />
            <Label className="cursor-pointer" htmlFor="log">
              Log Scale
            </Label>
          </div>
        </RadioGroup>
      )}
    </div>
  );
};

const dataToCsv = (data?: (string | number)[][]) => {
  if (!data || data.length === 0) {
    return undefined;
  }
  let csv = '';
  data.forEach((row) => {
    csv += row.join(',');
    csv += '\n';
  });
  return csv;
};

const ChartPage = ({
  title,
  children,
  description,
  data,
  sidebar,
  lastUpdatedTimestamp,
}: {
  title: string;
  children: ReactNode;
  description?: string;
  data?: (string | number)[][];
  sidebar?: ReactNode;
  lastUpdatedTimestamp?: string;
}) => {
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
  const csv = dataToCsv(data);
  const fileName = (title.indexOf(' (') > 0 ? title.substring(0, title.indexOf(' (')) : title)
    .replace(/&/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');

  console.log(
    'lastUpdatedTimestamp',
    lastUpdatedTimestamp,
    dayjs(Number(lastUpdatedTimestamp)).format('YYYY-MM-DD HH:mm:ss'),
  );
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row px-3 md:px-6 py-0 pt-3 md:pt-6">
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {description && [
            <Popover key="popover">
              <PopoverTrigger asChild>
                <HelpCircleIcon className="cursor-pointer md:hidden" size={16} />
              </PopoverTrigger>
              <PopoverContent>
                <p>
                  {description.split('\\n').map((item, index) => (index === 0 ? item : [<br key={index} />, item]))}
                </p>
              </PopoverContent>
            </Popover>,
            <Tooltip delayDuration={200} key="tooltip">
              <TooltipTrigger asChild>
                <HelpCircleIcon className="cursor-pointer hidden md:block" size={16} />
              </TooltipTrigger>

              <TooltipContent>
                <p className="max-w-96">
                  {description.split('\\n').map((item, index) => (index === 0 ? item : [<br key={index} />, item]))}
                </p>
              </TooltipContent>
            </Tooltip>,
          ]}
        </div>
        <div className="ml-auto">
          {sidebar ? (
            <Button
              className="hover:text-primary"
              onClick={() => setLayout(layout === 'vertical' ? 'horizontal' : 'vertical')}
              variant="accent"
            >
              {layout === 'vertical' ? 'Up Down' : 'Left Right'}
              {layout === 'vertical' ? (
                <Rows2Icon className="ml-1" size={16} />
              ) : (
                <Columns2Icon className="ml-1" size={16} />
              )}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent
        className={cn('p-3 md:p-6 grid gap-2', {
          'grid-cols-1': layout === 'vertical',
          'grid-cols-2': layout === 'horizontal',
        })}
      >
        <div className="bg-card-content rounded-lg p-3 flex flex-col gap-2">
          <div className="flex w-full items-start md:items-center flex-col md:flex-row gap-2">
            {lastUpdatedTimestamp && (
              <span className="text-sm text-muted-foreground">
                Updated at {dayjs(Number(lastUpdatedTimestamp)).format('YYYY-MM-DD HH:mm:ss')}(UTC{' '}
                {dayjs()
                  .format('Z')
                  .replace(':00', '')
                  .replace(/^([+-])0/, '$1')}
                )
              </span>
            )}
            {csv && (
              <a
                className="w-full md:w-auto ml-auto"
                download={`${fileName}.csv`}
                href={`data:text/csv;charset=utf-8,${encodeURI(csv)}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Button className="w-full md:w-auto hover:text-primary" variant="accent">
                  Download Data <DownloadIcon className="ml-1" size={16} />
                </Button>
              </a>
            )}
          </div>
          {children}
        </div>
        {sidebar ? <div className="bg-card-content rounded-lg p-3 flex flex-col gap-2">{sidebar}</div> : null}
      </CardContent>
    </Card>
  );
};

const ChartLoading = ({ isThumbnail }: { isThumbnail?: boolean }) => {
  return (
    <div
      className={cn('flex items-center justify-center bg-accent rounded-lg')}
      style={{ height: isThumbnail ? '200px' : '70vh' }}
    >
      <Image alt="loading" height={32} src={`/img/loading.png`} width={32} />
    </div>
  );
};

export function ChartThumbnail({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card className="bg-[#171A1F] p-3 rounded-lg">
      <CardHeader className="p-0 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{title}</span>
          {description && [
            <Popover key="popover">
              <PopoverTrigger asChild>
                <HelpCircleIcon className="cursor-pointer md:hidden" size={16} />
              </PopoverTrigger>
              <PopoverContent>
                <p>
                  {description.split('\\n').map((item, index) => (index === 0 ? item : [<br key={index} />, item]))}
                </p>
              </PopoverContent>
            </Popover>,
            <Tooltip delayDuration={200} key="tooltip">
              <TooltipTrigger asChild>
                <HelpCircleIcon className="cursor-pointer hidden md:block" size={16} />
              </TooltipTrigger>

              <TooltipContent>
                <p className="max-w-96">
                  {description.split('\\n').map((item, index) => (index === 0 ? item : [<br key={index} />, item]))}
                </p>
              </TooltipContent>
            </Tooltip>,
          ]}
        </div>
      </CardHeader>
      <CardContent className={cn('bg-[#23272C] rounded-lg p-2', className)}>{children}</CardContent>
    </Card>
  );
}

export interface SmartChartPageProps {
  title: string;
  thumbnailTitle?: string;
  description?: string;
  note?: string;
  isThumbnail?: boolean;
  chartProps?: Partial<ComponentProps<typeof ReactChartCore>>;
  isLoading?: boolean;
  option: echarts.EChartsOption;
  sidebar?: ReactNode;
  toCSV?: () => (string | number)[][];
  style?: CSSProperties;
  lastUpdatedTimestamp?: string;
  scale?: {
    enable?: boolean;
    initialScaleType?: string;
  };
}

export function SmartChartPage({
  title,
  thumbnailTitle = title,
  description,
  note,
  isThumbnail = false,
  chartProps,
  isLoading = false,
  option,
  toCSV,
  style,
  scale,
  sidebar,
  lastUpdatedTimestamp,
}: SmartChartPageProps): ReactElement {
  const content = isLoading ? (
    <ChartLoading isThumbnail={isThumbnail} />
  ) : (
    <ReactChartCore isThumbnail={isThumbnail} option={option} {...chartProps} scale={scale} style={style} />
  );

  return isThumbnail ? (
    <ChartThumbnail description={description} title={thumbnailTitle}>
      {content}
    </ChartThumbnail>
  ) : (
    <ChartPage
      data={toCSV?.()}
      description={description}
      lastUpdatedTimestamp={lastUpdatedTimestamp}
      sidebar={sidebar}
      title={title}
    >
      {content}
      {note != null && <div>{note}</div>}
    </ChartPage>
  );
}

export type SeriesItem = { seriesName: string; name: string; color: string; dataIndex: number };

export { ChartLoading, ChartPage, ReactChartCore };
