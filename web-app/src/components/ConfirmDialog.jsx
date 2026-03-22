import { AlertTriangle } from "lucide-react";
import styles from "../styles/ConfirmDialog.module.css";

// Renders a reusable confirm/cancel dialog for destructive and risky actions.
export default function ConfirmDialog({
  open,
  title = "Confirm Action",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className={styles.layer} role="presentation">
      <div className={styles.card} role="dialog" aria-modal="true">
        <div className={styles.iconWrap}>
          <AlertTriangle size={20} />
        </div>

        <div className={styles.content}>
          <h3>{title}</h3>
          <p>{message}</p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${danger ? styles.btnDanger : styles.btnPrimary}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
