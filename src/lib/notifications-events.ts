/** Dispatched after notifications are marked read so the bell dot clears in-session. */
export const NOTIFICATIONS_READ_EVENT = "freeway:notifications-read";

export function dispatchNotificationsRead() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
}
