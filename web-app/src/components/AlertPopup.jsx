import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import styles from "../styles/AlertPopup.module.css";

const iconByType = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

// Renders a transient, themed notification popup.
export default function AlertPopup({ open, type, title, message, onClose }) {
  if (!open) return null;

  const Icon = iconByType[type] || Info;

  const typeClass =
    type === "success"
      ? styles.popupSuccess
      : type === "error"
        ? styles.popupError
        : styles.popupInfo;

  return (
    <div className={styles.popupLayer} role="presentation">
      <div
        className={`${styles.popupCard} ${typeClass}`}
        role="alertdialog"
        aria-live="assertive"
      >
        <button
          className={styles.popupClose}
          onClick={onClose}
          aria-label="Close notification"
        >
          <X size={16} />
        </button>

        <div className={styles.popupIconWrap}>
          <Icon size={20} />
        </div>

        <div className={styles.popupContent}>
          <h4>{title || "Notification"}</h4>
          <p>{message || ""}</p>
        </div>
      </div>
    </div>
  );
}
