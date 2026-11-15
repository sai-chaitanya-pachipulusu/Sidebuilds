import { safeReturnTo } from './navigation';

export function notificationDestination(notification) {
  for (const candidate of [notification.action_url, notification.link]) {
    const destination = safeReturnTo(candidate, null);
    if (destination) return destination;
  }
  if (notification.related_transaction_id && /^[a-f0-9-]{36}$/i.test(notification.related_transaction_id))
    return `/project-transfer?transactionId=${encodeURIComponent(notification.related_transaction_id)}`;
  if (notification.related_project_id && /^[a-f0-9-]{36}$/i.test(notification.related_project_id)) return `/projects/${notification.related_project_id}`;
  return ['new_interest', 'new_message', 'purchase_request'].includes(notification.type?.toLowerCase()) ? '/inbox' : null;
}

export const announceNotificationsChanged = () => window.dispatchEvent(new Event('sidebuilds:notifications-updated'));
