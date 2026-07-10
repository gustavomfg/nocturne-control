import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="nocturne-dialog" aria-labelledby="confirm-dialog-title" onCancel={onClose} onClose={onClose}>
      <span>AEGIS CONFIRMATION</span>
      <h2 id="confirm-dialog-title">{title}</h2>
      <p>{message}</p>
      <div>
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="button" className="danger" onClick={() => {
          onConfirm();
          onClose();
        }}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
