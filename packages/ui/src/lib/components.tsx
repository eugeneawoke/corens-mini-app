import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes
} from "react";
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "beacon"
  | "success";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

type PanelTone = "default" | "muted" | "accent" | "warning" | "danger" | "beacon";

type FieldProps = {
  label?: string;
  hint?: string;
};

const buttonVariantClassName: Record<ButtonVariant, string> = {
  primary: "corens-button corens-button-primary",
  secondary: "corens-button corens-button-secondary",
  ghost: "corens-button corens-button-ghost",
  danger: "corens-button corens-button-danger",
  beacon: "corens-button corens-button-beacon",
  success: "corens-button corens-button-success"
};

const badgeToneClassName: Record<BadgeTone, string> = {
  neutral: "corens-badge corens-badge-neutral",
  accent: "corens-badge corens-badge-accent",
  success: "corens-badge corens-badge-success",
  warning: "corens-badge corens-badge-warning",
  danger: "corens-badge corens-badge-danger"
};

const panelToneClassName: Record<PanelTone, string> = {
  default: "corens-panel",
  muted: "corens-panel corens-panel-muted",
  accent: "corens-panel corens-panel-accent",
  warning: "corens-panel corens-panel-warning",
  danger: "corens-panel corens-panel-danger",
  beacon: "corens-panel corens-panel-beacon"
};

export function AppSurface({
  children,
  bottomBar
}: {
  children: ReactNode;
  bottomBar?: ReactNode;
}) {
  return (
    <div className="corens-app">
      <div className="corens-page">{children}</div>
      {bottomBar ? <div className="corens-bottom-bar">{bottomBar}</div> : null}
    </div>
  );
}

export function TopBar({
  title,
  subtitle,
  backHref,
  action
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="corens-topbar">
      <div className="corens-topbar-side">
        {backHref ? (
          <a className="corens-icon-button" href={backHref} aria-label="Назад">
            <ArrowLeft size={18} />
          </a>
        ) : (
          <div className="corens-topbar-placeholder" />
        )}
      </div>
      <div className="corens-topbar-copy">
        {subtitle ? <span className="corens-eyebrow">{subtitle}</span> : null}
        <h1 className="corens-topbar-title">{title}</h1>
      </div>
      <div className="corens-topbar-side corens-topbar-side-end">
        {action ?? <div className="corens-topbar-placeholder" />}
      </div>
    </header>
  );
}

export function Section({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="corens-section">
      <div className="corens-section-header">
        <h2 className="corens-section-title">{title}</h2>
        {description ? <p className="corens-copy corens-copy-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Panel({
  children,
  className,
  tone = "default"
}: HTMLAttributes<HTMLDivElement> & {
  tone?: PanelTone;
}) {
  return <div className={cn(panelToneClassName[tone], className)}>{children}</div>;
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button className={cn(buttonVariantClassName[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  className,
  variant = "primary"
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
}) {
  return (
    <a className={cn(buttonVariantClassName[variant], className)} href={href}>
      {children}
    </a>
  );
}

export function StatusBadge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return <span className={badgeToneClassName[tone]}>{children}</span>;
}

export function Metric({
  label,
  value
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="corens-metric">
      <span className="corens-metric-label">{label}</span>
      <span className="corens-metric-value">{value}</span>
    </div>
  );
}

export function ListRow({
  title,
  description,
  href,
  icon: Icon,
  trailing
}: {
  title: string;
  description?: string;
  href?: string;
  icon?: LucideIcon;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      <div className="corens-list-leading">
        {Icon ? (
          <span className="corens-list-icon">
            <Icon size={18} />
          </span>
        ) : null}
        <div className="corens-list-copy">
          <span className="corens-list-title">{title}</span>
          {description ? <span className="corens-list-description">{description}</span> : null}
        </div>
      </div>
      <div className="corens-list-trailing">
        {trailing}
        {href ? <ChevronRight size={16} /> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <a className="corens-list-row" href={href}>
        {content}
      </a>
    );
  }

  return <div className="corens-list-row">{content}</div>;
}

export function KeyChip({
  children,
  active = false
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return <span className={cn("corens-chip", active && "corens-chip-active")}>{children}</span>;
}

export function ChoiceTile({
  title,
  description,
  icon: Icon,
  selected = false
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  selected?: boolean;
}) {
  return (
    <button className={cn("corens-choice-tile", selected && "corens-choice-tile-selected")}>
      <div className="corens-choice-header">
        {Icon ? (
          <span className="corens-choice-icon">
            <Icon size={20} />
          </span>
        ) : null}
        {selected ? <StatusBadge tone="accent">Выбрано</StatusBadge> : null}
      </div>
      <strong className="corens-choice-title">{title}</strong>
      {description ? <span className="corens-choice-description">{description}</span> : null}
    </button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="corens-empty-state" tone="muted">
      <div className="corens-empty-orb">{Icon ? <Icon size={26} /> : null}</div>
      <h3 className="corens-card-title">{title}</h3>
      <p className="corens-copy corens-copy-muted corens-empty-description">{description}</p>
      {action}
    </Panel>
  );
}

export function NoticeCard({
  icon: Icon,
  title,
  description,
  tone = "muted"
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  tone?: PanelTone;
}) {
  return (
    <Panel tone={tone}>
      <div className="corens-notice">
        {Icon ? (
          <span className="corens-notice-icon">
            <Icon size={18} />
          </span>
        ) : null}
        <div className="corens-notice-copy">
          <strong className="corens-card-title">{title}</strong>
          <p className="corens-copy corens-copy-muted">{description}</p>
        </div>
      </div>
    </Panel>
  );
}

export function Field({
  label,
  hint,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="corens-field-wrap">
      {label ? <span className="corens-field-label">{label}</span> : null}
      <input className="corens-field" {...props} />
      {hint ? <span className="corens-field-hint">{hint}</span> : null}
    </label>
  );
}

export function TextareaField({
  label,
  hint,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="corens-field-wrap">
      {label ? <span className="corens-field-label">{label}</span> : null}
      <textarea className="corens-field corens-textarea" {...props} />
      {hint ? <span className="corens-field-hint">{hint}</span> : null}
    </label>
  );
}

export function SwitchRow({
  title,
  description,
  checked
}: {
  title: string;
  description: string;
  checked: boolean;
}) {
  return (
    <div className="corens-switch-row">
      <div className="corens-switch-copy">
        <strong className="corens-list-title">{title}</strong>
        <span className="corens-list-description">{description}</span>
      </div>
      <span className={cn("corens-switch", checked && "corens-switch-checked")}>
        <span className="corens-switch-thumb" />
      </span>
    </div>
  );
}
