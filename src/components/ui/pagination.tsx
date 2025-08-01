import Previous from './previous.svg';

import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '~/lib/utils';
import { ButtonProps, buttonVariants } from '~/components/ui/button';

export default function DefaultPagination({
  current,
  total,
  onChangePage,
}: {
  current?: number;
  total?: number;
  onChangePage: (page: number) => void;
}) {
  if (!total || !current || total <= 1) return null;
  return (
    <div className="flex gap-1 text-[13px] text-muted-foreground items-center">
      <button
        disabled={current === 1}
        onClick={() => {
          onChangePage(current - 1);
        }}
        className="disabled:opacity-30"
      >
        <Previous />
      </button>
      <button
        className="disabled:opacity-30 bg-[#222] px-1 h-6 rounded-sm"
        disabled={current === 1}
        onClick={() => onChangePage(1)}
      >
        First
      </button>
      <div className="mx-4">{`${current}/${total}`}</div>
      <button
        className="disabled:opacity-30 bg-[#222] px-1 h-6 rounded-sm"
        disabled={current === total}
        onClick={() => onChangePage(total)}
      >
        Last
      </button>
      <button
        className="disabled:opacity-30"
        disabled={current === total}
        onClick={() => {
          onChangePage(current + 1);
        }}
      >
        <Previous className="rotate-180" />
      </button>
    </div>
  );
}

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
);
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
  ),
);
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('', className)} {...props} />
));
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, 'size'> &
  React.ComponentProps<'a'>;

const PaginationLink = ({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) => (
  <a
    aria-current={isActive ? 'page' : undefined}
    aria-disabled={!isActive}
    className={cn(
      buttonVariants({
        variant: isActive ? 'outline' : 'ghost',
        size,
      }),
      className,
    )}
    {...props}
  />
);
PaginationLink.displayName = 'PaginationLink';

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" size="default" className={cn('gap-1 pl-2.5', className)} {...props}>
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" size="default" className={cn('gap-1 pr-2.5', className)} {...props}>
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = 'PaginationNext';

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span aria-hidden className={cn('flex h-9 w-9 items-center justify-center', className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
