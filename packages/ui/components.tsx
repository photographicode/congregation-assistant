import { Toast as TimedToast } from "./Notices";
import { Dialog } from "./Dialog";
import React from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Minus,
  Plus,
  Search,
  Undo2,
} from "lucide-react";
import { t } from "../core/i18n";
export { Dialog as BottomSheet } from "./Dialog";
export { Dialog };
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "danger" | "default";
    busy?: boolean;
  }
>(function Button({ variant = "default", busy, children, ...props }, ref) {
  return (
    <button
      {...props}
      ref={ref}
      className={[variant, props.className].filter(Boolean).join(" ")}
      disabled={props.disabled || busy}
      aria-busy={busy || undefined} type={props.type ?? "button"}
    >
      {children}
    </button>
  );
});
export function IconButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <Button
      {...props}
      className={"icon-button " + (props.className || "")}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}
export function Card({
  title,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { title?: string }) {
  return (
    <section {...props} className={"card " + (props.className || "")}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
export function ProgressRing({
  value,
  max = 100,
  label,
}: {
  value: number;
  max?: number;
  label: string;
}) {
  const percentage =
    max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <svg
      className="ui-progress-ring"
      viewBox="0 0 40 40"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <circle cx="20" cy="20" r="16" />
      <circle
        cx="20"
        cy="20"
        r="16"
        pathLength={100}
        strokeDasharray={`${percentage} 100`}
      />
    </svg>
  );
}
export function StatTile({
  label,
  value,
  detail,
  trend = [],
  onClick,
}: {
  label: string;
  value: number;
  detail?: string;
  trend?: number[];
  onClick?: () => void;
}) {
  const [count, setCount] = React.useState(value);
  React.useEffect(() => {
    if (
      matchMedia("(prefers-reduced-motion:reduce)").matches ||
      document.documentElement.dataset.motion === "reduced"
    ) {
      setCount(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 240);
      setCount(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  const low = Math.min(...trend),
    range = Math.max(1, Math.max(...trend) - low);
  return (
    <Button
      className="card ui-stat"
      onClick={onClick}
      aria-label={label + ": " + value}
    >
      <span>{label}</span>
      <strong aria-hidden="true">{count.toLocaleString()}</strong>
      {detail && <span>{detail}</span>}
      {trend.length > 1 && (
        <svg viewBox="0 0 100 30" aria-hidden="true">
          <polyline
            points={trend
              .map(
                (v, i) =>
                  `${(i / (trend.length - 1)) * 100},${28 - ((v - low) / range) * 26}`,
              )
              .join(" ")}
          />
        </svg>
      )}
    </Button>
  );
}
export function ListRow({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <article className="list-row ui-list-row">
      <div>{children}</div>
      {actions && <div className="actions ui-row-actions">{actions}</div>}
    </article>
  );
}
export function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "ok" | "warn" | "danger";
}) {
  return <span className={"chip ui-chip-" + tone}>{children}</span>;
}
export type Option = {
  value: string;
  label: string;
  secondary?: string;
  meta?: string;
  disabled?: boolean;
};
export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <Button
          key={option.value}
          aria-pressed={value === option.value}
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="ui-switch"
    >
      <span className="ui-switch-track" aria-hidden="true">
        <span />
      </span>
      {label}
    </Button>
  );
}
export function Select(props: React.ComponentProps<typeof Combobox>) {
  return <Combobox {...props} />;
}
/** Compatibility adapter while screens move from option children to the typed API. */
export function LegacySelect({
  children,
  value,
  onChange,
  disabled,
  required,
  "aria-label": ariaLabel,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  onChange?: (event: { target: { value: string } }) => void;
}) {
  const options: Option[] = [];
  function collect(nodes: React.ReactNode) {
    React.Children.forEach(nodes, (node) => {
      if (!React.isValidElement(node)) return;
      if (node.type === React.Fragment) {
        collect((node.props as { children?: React.ReactNode }).children);
        return;
      }
      if (node.type === "option") {
        const option = node.props as {
          value?: string | number;
          children?: React.ReactNode;
          disabled?: boolean;
        };
        options.push({
          value: String(option.value ?? ""),
          label: React.Children.toArray(option.children).join(""),
          disabled: option.disabled,
        });
        return;
      }
      collect((node.props as { children?: React.ReactNode }).children);
    });
  }
  collect(children);
  return (
    <Combobox
      label={ariaLabel || String(props.name || "Choose")}
      value={String(value ?? "")}
      options={options}
      disabled={disabled}
      clearLabel={
        required
          ? undefined
          : options.find((option) => option.value === "")?.label
      }
      onChange={(next) => onChange?.({ target: { value: next } })}
    />
  );
}
export function DisclosureLabel({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function Disclosure({
  children,
  className = "",
  open: initial = false,
}: {
  children: React.ReactNode;
  className?: string;
  open?: boolean;
}) {
  const [open, setOpen] = React.useState(initial),
    items = React.Children.toArray(children),
    labelNode = items.find(
      (node) => React.isValidElement(node) && node.type === DisclosureLabel,
    ) as React.ReactElement<{ children: React.ReactNode }> | undefined,
    content = items.filter((node) => node !== labelNode),
    label = labelNode?.props.children || t("common.more");
  return (
    <div className={className}>
      <Button type="button" className="secondary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={typeof label === "string" ? label : t("common.more")}
      >
        <div className="stack">{content}</div>
      </Dialog>
    </div>
  );
}
export function Combobox({
  label,
  value,
  options,
  onChange,
  disabled = false,
  clearLabel,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  clearLabel?: string;
}) {
  const id = React.useId(),
    trigger = React.useRef<HTMLButtonElement>(null),
    search = React.useRef<HTMLInputElement>(null),
    [query, setQuery] = React.useState(""),
    [open, setOpen] = React.useState(false),
    [active, setActive] = React.useState(0);
  const all = clearLabel
      ? [{ value: "", label: clearLabel }, ...options]
      : options,
    filtered = (
      query
        ? all.filter((option) =>
            (
              option.label +
              " " +
              (option.secondary || "") +
              " " +
              (option.meta || "")
            )
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()),
          )
        : all
    ).slice(0, 200),
    selected = all.find((option) => option.value === value);
  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    queueMicrotask(() => trigger.current?.focus());
  }, []);
  React.useEffect(() => {
    if (!open) return;
    setActive(
      Math.max(
        0,
        filtered.findIndex((option) => option.value === value),
      ),
    );
    queueMicrotask(() => search.current?.focus());
    const outside = (event: PointerEvent) => {
      if (
        !(event.target as Element).closest?.(
          '[data-combobox-root="' + id + '"]',
        )
      )
        close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, id, close, value]);
  function choose(option: Option) {
    if (option.disabled) return;
    onChange(option.value);
    close();
  }
  function key(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : Math.max(0, filtered.length - 1));
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((index) =>
        Math.max(
          0,
          Math.min(
            filtered.length - 1,
            index + (event.key === "ArrowDown" ? 1 : -1),
          ),
        ),
      );
      return;
    }
    if (event.key === "Enter" && open && filtered[active]) {
      event.preventDefault();
      choose(filtered[active]);
    }
  }
  return (
    <div className="ui-combobox" data-combobox-root={id}>
      <label id={id + "-label"}>{label}</label>
      <button
        ref={trigger}
        type="button"
        className="ui-combobox-trigger"
        data-value={value}
        disabled={disabled}
        role="combobox"
        aria-labelledby={id + "-label"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id + "-options" : undefined}
        onClick={() => setOpen((state) => !state)}
        onKeyDown={key}
      >
        <span>{selected?.label || clearLabel || t("oclm.needsPerson")}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="ui-combobox-popover">
          {all.length > 8 && (
            <label>
              {t("common.search")}
              <input
                ref={search}
                type="search"
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={key}
              />
            </label>
          )}
          <ul
            id={id + "-options"}
            role="listbox"
            aria-labelledby={id + "-label"}
          >
            {filtered.map((option, index) => (
              <li
                id={id + "-" + index}
                key={option.value}
                role="option"
                data-value={option.value}
                aria-selected={option.value === value}
                aria-disabled={option.disabled || undefined}
                className={index === active ? "active" : ""}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(option)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    choose(option);
                  }
                }}
              >
                <span className="ui-option-copy">
                  <strong>{option.label}</strong>
                  {option.secondary && <small>{option.secondary}</small>}
                </span>
                {option.meta && (
                  <span className="ui-option-meta">{option.meta}</span>
                )}
                {option.value === value && <Check aria-hidden="true" />}
              </li>
            ))}
            {!filtered.length && (
              <li role="option" aria-selected={false} aria-disabled="true">
                {t("common.noResults")}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label>
      {label}
      <span className="ui-stepper">
        <IconButton
          type="button"
          label={t("stepper.less") + " " + label}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          <Minus />
        </IconButton>
        <input
          aria-label={label}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next))
              onChange(Math.max(min, Math.min(max, next)));
          }}
        />
        <IconButton
          type="button"
          label={t("stepper.more") + " " + label}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
        >
          <Plus />
        </IconButton>
      </span>
    </label>
  );
}
export function WeekPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => {
          const date = new Date(event.target.value + "T12:00:00Z");
          if (Number.isFinite(date.getTime())) {
            date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
            onChange(date.toISOString().slice(0, 10));
          }
        }}
      />
    </label>
  );
}
export function Toast({
  message,
  onUndo,
  onClose,
}: {
  message: string;
  onUndo?: () => void;
  onClose: () => void;
}) {
  return (
    <TimedToast
      className="ui-toast"
      message={message}
      onClose={onClose}
      duration={onUndo ? 8000 : 5000}
    >
      {onUndo && <Button onClick={onUndo}>{t("common.undo")}</Button>}
    </TimedToast>
  );
}
export function Banner({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "error";
}) {
  return (
    <div
      className={"banner ui-banner-" + tone}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function EmptyState({
  illustration,
  title,
  description,
  action,
}: {
  illustration: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <section className="empty-scene">
      {illustration}
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}
export function Skeleton({ label = t("common.loading") }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="ui-skeleton">
      <span />
      <span />
      <span />
    </div>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="ui-avatar" role="img" aria-label={name}>
      {name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toLocaleUpperCase()}
    </span>
  );
}
export function QRCode({
  value,
  label = t("qr.code"),
}: {
  value: string;
  label?: string;
}) {
  const [url, setURL] = React.useState("");
  React.useEffect(() => {
    let active = true;
    void import("qrcode")
      .then((module) => module.toDataURL(value, { margin: 2, width: 240 }))
      .then((result) => {
        if (active) setURL(result);
      })
      .catch(() => {
        if (active) setURL("");
      });
    return () => {
      active = false;
    };
  }, [value]);
  return url ? (
    <img src={url} width={240} height={240} alt={label} />
  ) : (
    <CopyField label={label} value={value} />
  );
}
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div>
      <label>
        {label}
        <input readOnly value={value} />
      </label>
      <Button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        <Copy />
        {copied ? t("common.copied") : t("common.copy")}
      </Button>
    </div>
  );
}
export function PersonPicker({
  people,
  ...props
}: Omit<React.ComponentProps<typeof Combobox>, "options"> & {
  people: Array<{ id: string; name: string }>;
}) {
  return (
    <Combobox
      {...props}
      options={people.map((person) => ({
        value: person.id,
        label: person.name,
      }))}
    />
  );
}
export function Wizard({
  steps,
  step,
  onStep,
  children,
}: {
  steps: string[];
  step: number;
  onStep: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="stack">
      <ol className="ui-wizard-steps">
        {steps.map((label, index) => (
          <li key={label} aria-current={index === step ? "step" : undefined}>
            {label}
          </li>
        ))}
      </ol>
      {children}
      <div className="actions">
        <Button disabled={step === 0} onClick={() => onStep(step - 1)}>
          {t("common.back")}
        </Button>
        <Button
          variant="primary"
          disabled={step === steps.length - 1}
          onClick={() => onStep(step + 1)}
        >
          {t("common.next")}
        </Button>
      </div>
    </section>
  );
}
export function Tabs({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: Array<Option & { content: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = React.useId();
  return (
    <div>
      <div role="tablist" aria-label={label} className="segmented">
        {tabs.map((tab, index) => (
          <Button
            role="tab"
            key={tab.value}
            id={id + "-tab-" + tab.value}
            aria-controls={id + "-panel-" + tab.value}
            aria-selected={value === tab.value}
            tabIndex={value === tab.value ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => {
              if (
                ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (event.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length;
                onChange(tabs[next].value);
                document
                  .getElementById(id + "-tab-" + tabs[next].value)
                  ?.focus();
              }
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.value}
          id={id + "-panel-" + tab.value}
          role="tabpanel"
          aria-labelledby={id + "-tab-" + tab.value}
          hidden={value !== tab.value}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
export type Column<Row> = {
  id: string;
  label: string;
  cell: (row: Row) => React.ReactNode;
  sort?: (row: Row) => string | number;
};
export function DataTable<Row extends { id: string }>({
  label,
  rows,
  columns,
  actions,
}: {
  label: string;
  rows: Row[];
  columns: Column<Row>[];
  actions?: (row: Row) => React.ReactNode;
}) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [sort, setSort] = React.useState<{
      id: string;
      ascending: boolean;
    } | null>(null),
    [scroll, setScroll] = React.useState(0),
    [height, setHeight] = React.useState(72),
    measure = React.useRef<HTMLTableRowElement | null>(null);
  React.useEffect(() => {
    if (!measure.current) return;
    const observer = new ResizeObserver((entries) =>
      setHeight(Math.max(72, Math.ceil(entries[0].contentRect.height))),
    );
    observer.observe(measure.current);
    return () => observer.disconnect();
  }, [rows, columns]);
  const sorted = React.useMemo(() => {
    const column = columns.find((column) => column.id === sort?.id);
    return sort && column?.sort
      ? [...rows].sort((a, b) => {
          const first = column.sort!(a),
            second = column.sort!(b);
          return (
            (typeof first === "number" && typeof second === "number"
              ? first - second
              : String(first).localeCompare(String(second))) *
            (sort.ascending ? 1 : -1)
          );
        })
      : rows;
  }, [rows, sort, columns]);
  const start = Math.max(0, Math.floor(scroll / height) - 2),
    visible = sorted.slice(start, start + 14),
    count = columns.length + (actions ? 1 : 0);
  return (
    <div
      ref={scrollRef}
      className="ui-table-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
      onScroll={(event) => setScroll(event.currentTarget.scrollTop)}
    >
      <table aria-label={label} aria-rowcount={rows.length + 1}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                aria-sort={
                  sort?.id === column.id
                    ? sort.ascending
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {column.sort ? (
                  <Button
                    onClick={() => {
                      setSort({
                        id: column.id,
                        ascending: sort?.id !== column.id || !sort.ascending,
                      });
                      setScroll(0);
                      if (scrollRef.current) scrollRef.current.scrollTop = 0;
                    }}
                  >
                    {column.label}
                  </Button>
                ) : (
                  column.label
                )}
              </th>
            ))}
            {actions && <th scope="col">{t("table.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {start > 0 && (
            <tr aria-hidden="true">
              <td
                colSpan={count}
                style={{ height: start * height, padding: 0 }}
              />
            </tr>
          )}
          {visible.map((row, index) => (
            <tr
              key={row.id}
              ref={index === 0 ? measure : undefined}
              aria-rowindex={start + index + 2}
            >
              {columns.map((column) => (
                <td key={column.id}>{column.cell(row)}</td>
              ))}
              {actions && (
                <td>
                  <div className="actions">{actions(row)}</div>
                </td>
              )}
            </tr>
          ))}
          {start + visible.length < sorted.length && (
            <tr aria-hidden="true">
              <td
                colSpan={count}
                style={{
                  height: (sorted.length - start - visible.length) * height,
                  padding: 0,
                }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function Row({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={"ui-row " + className} />;
}
export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className="ui-field">
      <label>
        {label}
        {children}
      </label>
      {help && <small id={id}>{help}</small>}
    </div>
  );
}
export function Section({
  title,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { title: string }) {
  return (
    <section {...props} className={"card stack " + (props.className || "")}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
