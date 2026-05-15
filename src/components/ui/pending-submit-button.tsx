"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
  className?: string;
};

export function PendingSubmitButton({
  label,
  pendingLabel,
  disabled = false,
  className = "button button--primary"
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={disabled || pending} type="submit">
      {pending ? <span aria-hidden="true" className="loading-spinner" /> : null}
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}

export function PendingFormStatus({
  message,
  detail
}: {
  message: string;
  detail?: string;
}) {
  const { pending } = useFormStatus();

  if (!pending) return null;

  return (
    <div className="pending-status" role="status" aria-live="polite">
      <span aria-hidden="true" className="loading-spinner" />
      <div>
        <strong>{message}</strong>
        {detail ? <span>{detail}</span> : null}
      </div>
    </div>
  );
}
