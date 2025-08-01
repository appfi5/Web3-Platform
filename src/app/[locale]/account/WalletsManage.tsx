'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowRight, LoaderCircle, TrashIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { type ComponentProps } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { type z } from 'zod';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { useToast } from '~/hooks/use-toast';
import { cn } from '~/lib/utils';
import { newWalletValidator } from '~/server/types/account';
import { api } from '~/trpc/react';
import { type RouterInputs, type RouterOutputs } from '~/trpc/react';

import { NetworkIcon } from '../address/[address]/utils';
import EmptySvg from './empty.svg';

export const WalletsManage = ({ className, ...props }: ComponentProps<'div'>) => {
  const wallets = api.account.getWatchingAddresses.useQuery();

  if (wallets.error) {
    return (
      <Link className={cn('cursor-pointer flex items-center gap-1 text-sm', className)} href="signin">
        Sign In <ArrowRight size={16} />
      </Link>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={cn('cursor-pointer flex items-center gap-1 text-sm', className)} {...props}>
          Wallets ({wallets.isLoading ? <LoaderCircle className="animate-spin" size={16} /> : wallets.data?.length})
          <ArrowRight size={16} />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-[800px] p-4" hiddenClose>
        <DialogHeader>
          <DialogTitle>Wallets Manage</DialogTitle>
        </DialogHeader>
        <WalletsTable />
      </DialogContent>
    </Dialog>
  );
};

export function WalletsTable({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  const { data = [], isLoading, refetch } = api.account.getWatchingAddresses.useQuery();
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const removeWallet = api.account.removedWatchingAddress.useMutation();
  const addWallet = api.account.addWatchingAddress.useMutation();

  const columns: ColumnDef<RouterOutputs['account']['getWatchingAddresses'][0]>[] = [
    {
      accessorKey: 'no',
      header: 'No.',
      cell: ({ row }) => <div>{row.index + 1}</div>,
    },
    {
      accessorKey: 'network',
      header: 'Chain',
      cell: ({ row }) => (
        <div className="flex items-center">
          <Image
            alt="icon"
            className="rounded-full mr-1"
            height={28}
            src={NetworkIcon[row.original.network]}
            width={28}
          />
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => <div>{row.original.description !== '' ? row.original.description : 'Wallet'}</div>,
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => (
        <Link className="text-primary" href={row.original.address}>
          {row.original.address.slice(0, 4)}...{row.original.address.slice(-4)}
        </Link>
      ),
    },
    {
      header: 'Action',
      cell: ({ row }) => (
        <AlertDialog>
          <AlertDialogTrigger>
            <span className="cursor-pointer">
              <TrashIcon size={16} />
            </span>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove your data from our
                servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  removeWallet.mutate(
                    { address: row.original.address, network: row.original.network },
                    {
                      onSuccess: () => {
                        toast({ title: 'Success' });
                        refetch().catch(() => []);
                      },
                    },
                  )
                }
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      pagination,
      sorting,
    },
  });

  return (
    <div className={cn('rounded-md space-y-4', className)} {...props}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              className="max-md:flex max-md:flex-wrap max-md:items-center max-md:justify-between border-b-0"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header) => (
                <TableHead className="p-1 h-8" key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="relative max-md:hidden">
          {table.getRowModel().rows?.map((row) => (
            <TableRow
              className="border-0 hover:bg-opacity-100 odd:bg-[#1C2024]"
              data-state={row.getIsSelected() && 'selected'}
              key={row.id}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell className="first:rounded-l-md last:rounded-r-md p-1" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {isLoading && (
        <div className="flex items-center justify-center w-full h-64">
          <LoaderCircle className="animate-spin" />
        </div>
      )}

      {!isLoading && table.getRowModel().rows?.length === 0 && (
        <div className="min-h-64 flex flex-col justify-center items-center">
          <EmptySvg className="w-24 text-center" />
          <p>No Data</p>
        </div>
      )}

      <NewWalletForm
        onSubmit={(data) =>
          addWallet.mutate(data, {
            onSuccess: () => {
              toast({ title: 'Success' });
              refetch().catch(() => []);
            },
          })
        }
      />
    </div>
  );
}

export type FormValues = z.infer<typeof newWalletValidator>;
const NewWalletForm = ({
  onSubmit,
}: {
  onSubmit: (data: RouterInputs['account']['addWatchingAddress']) => unknown;
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(newWalletValidator),
    defaultValues: {
      network: undefined,
      description: '',
      address: '',
    },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex items-start gap-2">
          <FormField
            control={form.control}
            name="network"
            render={({ field }) => (
              <FormItem>
                <Select defaultValue={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CKB">CKB</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs text-red-500 mt-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="Description" {...field} />
                </FormControl>
                <FormMessage className="text-xs text-red-500 mt-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="Public-key/Address" {...field} />
                </FormControl>
                <FormMessage className="text-xs text-red-500 mt-1" />
              </FormItem>
            )}
          />

          <Button type="submit">Add</Button>
        </div>
      </form>
    </Form>
  );
};
