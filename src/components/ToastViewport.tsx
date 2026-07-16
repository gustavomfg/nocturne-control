import { useEffect, useState } from "react";

import { UI_NOTICE_EVENT } from "../utils/uiEvents.ts";
import type { UiNotice } from "../utils/uiEvents.ts";

type ActiveNotice = UiNotice & { id: number };

export function ToastViewport() {
  const [notices, setNotices] = useState<ActiveNotice[]>([]);

  useEffect(() => {
    function showNotice(event: Event) {
      const notice = (event as CustomEvent<UiNotice>).detail;
      const activeNotice = { ...notice, id: Date.now() + Math.random() };
      setNotices((current) => [...current.slice(-2), activeNotice]);
      window.setTimeout(() => {
        setNotices((current) => current.filter((item) => item.id !== activeNotice.id));
      }, 4200);
    }

    window.addEventListener(UI_NOTICE_EVENT, showNotice);
    return () => window.removeEventListener(UI_NOTICE_EVENT, showNotice);
  }, []);

  return (
    <aside className="toast-viewport" aria-label="System notifications" aria-live="polite">
      {notices.map((notice) => (
        <article key={notice.id} className={`toast ${notice.tone ?? "info"}`}>
          <div>
            <strong>{notice.title}</strong>
            {notice.message && <p>{notice.message}</p>}
          </div>
          <button type="button" aria-label="Dismiss notification" onClick={() =>
            setNotices((current) => current.filter((item) => item.id !== notice.id))
          }>×</button>
        </article>
      ))}
    </aside>
  );
}
