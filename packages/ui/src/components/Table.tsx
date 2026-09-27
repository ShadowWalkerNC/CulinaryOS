import * as React from 'react';
import { cn } from '../lib/utils';

interface TableContextValue {
  dense?: boolean;
}

const TableContext = React.createContext<TableContextValue>({ dense: false });

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  dense?: boolean;
  containerClassName?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, dense = false, ...props }, ref) => (
    <TableContext.Provider value={{ dense }}>
      <div className={cn('relative w-full overflow-auto rounded-xl border border-border bg-card shadow-xs', containerClassName)}>
        <table
          ref={ref}
          className={cn(
            'w-full caption-bottom text-xs text-left',
            dense && 'text-[11px]',
            className
          )}
          {...props}
        />
      </div>
    </TableContext.Provider>
  )
);
Table.displayName = 'Table';

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, sticky = true, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        'bg-muted/50 border-b border-border',
        sticky && 'sticky top-0 z-10 backdrop-blur-md bg-card/95 border-b',
        className
      )}
      {...props}
    />
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0 divide-y divide-border', className)} {...props} />
));
TableBody.displayName = 'TableBody';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  zebra?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, zebra = true, tabIndex = 0, ...props }, ref) => (
    <tr
      ref={ref}
      tabIndex={tabIndex}
      className={cn(
        'border-b border-border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:z-10 relative cursor-pointer',
        zebra
          ? 'even:bg-muted/30 hover:bg-muted/50 data-[state=selected]:bg-muted'
          : 'hover:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  dense?: boolean;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, dense: localDense, ...props }, ref) => {
    const { dense: ctxDense } = React.useContext(TableContext);
    const dense = localDense ?? ctxDense;
    return (
      <th
        ref={ref}
        className={cn(
          'h-9 px-4 text-left align-middle font-black uppercase text-[10px] text-muted-foreground tracking-wider',
          dense && 'h-7 px-3 py-1 text-[9px]',
          className
        )}
        {...props}
      />
    );
  }
);
TableHead.displayName = 'TableHead';

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  dense?: boolean;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, dense: localDense, ...props }, ref) => {
    const { dense: ctxDense } = React.useContext(TableContext);
    const dense = localDense ?? ctxDense;
    return (
      <td
        ref={ref}
        className={cn(
          'p-4 align-middle text-xs [&:has([role=checkbox])]:pr-0',
          dense && 'p-2.5 text-[11px]',
          className
        )}
        {...props}
      />
    );
  }
);
TableCell.displayName = 'TableCell';

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t border-border bg-muted/50 font-bold [&>tr]:last:border-b-0', className)}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-xs text-muted-foreground', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';
