import { useId, useState, type ReactNode } from "react";

type Props = {
  summary: { label: string; value: string }[];
  className: string;
  children: ReactNode;
};

export default function InvestmentControls({
  summary,
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="border-border flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium sm:hidden"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(current => !current)}
      >
        <span>计算参数</span>
        <span aria-hidden="true">{open ? "收起 −" : "调整 +"}</span>
      </button>
      {!open && (
        <dl className="text-muted-foreground mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:hidden">
          {summary.map(item => (
            <div className="flex justify-between gap-2" key={item.label}>
              <dt>{item.label}</dt>
              <dd className="text-foreground tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div id={id} className={`${open ? "grid" : "hidden"} ${className}`}>
        {children}
      </div>
    </>
  );
}
