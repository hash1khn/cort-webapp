self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'New Notification', body: event.data.text() };
  }

  const { title = 'CORT', body = '', url = '/admin/bookings/pending', data } = payload;
  const tag =
    typeof data?.type === 'string'
      ? `cort-${String(data.type).toLowerCase()}`
      : url?.includes('/ops/shuttle')
        ? 'cort-shuttle'
        : 'cort-booking';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag,
      renotify: true,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/admin/bookings/pending';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.navigate(url);
        } else {
          clients.openWindow(url);
        }
      })
  );
});
