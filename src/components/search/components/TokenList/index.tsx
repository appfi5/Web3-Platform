'use client';

import Link from 'next/link';
import numbro from 'numbro';
import { type FC, useState } from 'react';

import { Card, CardContent, CardFooter } from '~/components/ui/card';
import Pagination from '~/components/ui/pagination';
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { api } from '~/trpc/react';

import Expand from '../../icon/expand.svg';
import ViewDetail from '../../icon/view-detail.svg';

const pageSize = 10;

const TokenList: FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = api.rgbpp.coinList.useQuery({ page, pageSize });
  const pageCount = Math.ceil((data?.pagination.total ?? 0) / pageSize);

  return (
    <Card className="p-3 h-full flex flex-col gap-2">
      <CardContent className="p-0 grow h-[calc(100%-76px)] flex flex-col">
        <div className="flex items-center text-base gap-1 mb-2">
          List
          <span className="text-muted-foreground text-xs">XUDT List</span>
          <Link
            className="flex items-center ml-auto hover:opacity-80"
            href={`/chart/hodl-wave`}
            rel="noreferrer noopener"
            target="_blank"
          >
            <Expand className="size-5" />
          </Link>
        </div>
        <Card className="bg-accent h-40 flex-1 overflow-y-auto overflow-x-hidden">
          {!isLoading && data ? (
            <Table className="overflow-hidden table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Market Cap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((v) => {
                  return (
                    <TableRow
                      className="border-none [&>td]:odd:bg-[#1c2024] [&>td]:p-2 [&>td]:px-4 overflow-hidden"
                      key={v.info.id}
                    >
                      <TableCell className="overflow-hidden">
                        <div className="flex gap-1 items-center overflow-hidden">
                          <img alt={v.info.name ?? ''} className="size-7 rounded-full" src={v.info.icon ?? ''} />
                          <div className="flex flex-col justify-between overflow-hidden">
                            <p className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">{v.info.name}</p>
                            <p className="text-xs text-secondary overflow-hidden text-ellipsis whitespace-nowrap">
                              {v.info.symbol}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 text-sm">
                          ${' '}
                          {numbro(v.quote.price ?? 0).format({
                            thousandSeparated: true,
                            mantissa: 2,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 text-sm">
                          ${' '}
                          {numbro(v.quote.marketCap ?? 0).format({
                            thousandSeparated: true,
                            mantissa: 2,
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Skeleton className="h-48 w-full bg-accent" />
          )}
        </Card>
      </CardContent>
      <CardFooter className="p-0 flex flex-col gap-1">
        <div className="flex justify-center">
          <Pagination current={page} onChangePage={setPage} total={pageCount} />
        </div>
        <div className="flex justify-end w-full">
          <Link
            className="h-8 px-4 flex items-center gap-1 bg-accent text-xs text-secondary rounded-full hover:opacity-80"
            href={`/chart/hodl-wave`}
            target="_blank"
          >
            View CKB HODL Wave
            <ViewDetail />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TokenList;
