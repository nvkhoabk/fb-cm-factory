import { useState, type ReactNode } from "react";
import { helpContent, type HelpPageContent, type HelpPageKey, type ScriptStepHelp, type StepHelpContent } from "./helpContent";

type HelpTooltipProps = {
  text: string;
  trainingMode?: boolean;
};

export function HelpTooltip({ text, trainingMode }: HelpTooltipProps) {
  return (
    <span className={`helpTooltip ${trainingMode ? "expanded" : ""}`} tabIndex={0} aria-label={text}>
      <span className="helpIcon">?</span>
      {trainingMode ? <span className="helpInlineText">{text}</span> : null}
      <span className="helpTooltipBubble">{text}</span>
    </span>
  );
}

export function HelpPopover({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="helpPopover">
      <button type="button" className="helpIconButton" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        ?
      </button>
      {open ? (
        <span className="helpPopoverCard">
          <strong>{title}</strong>
          <span>{children}</span>
        </span>
      ) : null}
    </span>
  );
}

export function FeatureHint({ children, show }: { children: ReactNode; show: boolean }) {
  if (!show) return null;
  return <div className="featureHint">{children}</div>;
}

export function EmptyStateGuide({ text }: { text: string }) {
  return (
    <div className="emptyStateGuide">
      <strong>Gợi ý tiếp theo</strong>
      <span>{text}</span>
    </div>
  );
}

export function PageQuickGuideButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="quickGuideButton" onClick={onClick}>
      <span>?</span>
      Hướng dẫn nhanh
    </button>
  );
}

export function HelpPanel({
  content,
  open,
  onClose,
  onNavigate
}: {
  content: HelpPageContent;
  open: boolean;
  onClose: () => void;
  onNavigate: (target: HelpPageKey) => void;
}) {
  if (!open) return null;
  return (
    <div className="helpDrawerOverlay" role="presentation" onMouseDown={onClose}>
      <aside className="helpDrawer" role="dialog" aria-modal="true" aria-label={content.title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Operator Helper</span>
            <strong>{content.title}</strong>
          </div>
          <button type="button" className="iconButton" onClick={onClose}>x</button>
        </header>
        <section>
          <h2>Mục đích trang</h2>
          <p>{content.purpose}</p>
        </section>
        <GuideList title="Khi nào dùng" items={content.whenToUse} />
        <GuideList title="Quy trình cơ bản" items={content.workflow} ordered />
        <GuideList title="Lưu ý quan trọng" items={content.tips} />
        <section>
          <h2>Liên kết nhanh</h2>
          <div className="helpLinkList">
            {content.relatedLinks.map((link) => (
              <button type="button" key={`${link.target}-${link.label}`} onClick={() => onNavigate(link.target)}>
                {link.label}
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

export function PageQuickGuide({
  pageKey,
  onOpen
}: {
  pageKey: HelpPageKey;
  onOpen: (pageKey: HelpPageKey) => void;
}) {
  const content = helpContent.pages[pageKey];
  return (
    <div className="pageQuickGuide">
      <PageQuickGuideButton onClick={() => onOpen(pageKey)} />
      <span>{content.purpose}</span>
    </div>
  );
}

export function ProductionStepGuide({ steps, show }: { steps: StepHelpContent[]; show: boolean }) {
  if (!show) return null;
  return (
    <div className="productionStepGuide">
      {steps.map((step, index) => (
        <article key={step.label}>
          <span>{index + 1}</span>
          <div>
            <strong>{step.label}</strong>
            <p>{step.description}</p>
            <small>Cảnh báo: {step.warning}</small>
            <small>Đạt khi: {step.success}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ScriptStepHelpPanel({ help, show }: { help?: ScriptStepHelp; show: boolean }) {
  if (!show || !help) return null;
  return (
    <div className="scriptStepHelpPanel">
      <strong>Step helper</strong>
      <p>{help.what}</p>
      <span>Khi dùng: {help.when}</span>
      <ul>
        {help.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}
      </ul>
    </div>
  );
}

function GuideList({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <section>
      <h2>{title}</h2>
      <ListTag>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ListTag>
    </section>
  );
}
