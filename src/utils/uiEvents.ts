export type NoticeTone = "success" | "warning" | "info";

export type UiNotice = {
  title: string;
  message?: string;
  tone?: NoticeTone;
};

export const UI_NOTICE_EVENT = "nocturne:notice";

export function notify(notice: UiNotice) {
  window.dispatchEvent(new CustomEvent<UiNotice>(UI_NOTICE_EVENT, { detail: notice }));
}
