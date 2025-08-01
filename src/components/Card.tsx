import { cn } from '~/lib/utils';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-4 border-[1px] border-border rounded-[16px] bg-card', className)}>{children}</div>;
}

export function CardContent({ children, className, ...other }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-card-content p-3 rounded-[12px]', className)} {...other}>
      {children}
    </div>
  );
}
