export const environment = {
  apiBaseUrl: '',
  calculatorWsUrl: 'wss://ts.idicorp.ir/ws/calculator',
  echoWsUrl: 'wss://ts.idicorp.ir/ws/echo',
  // نسخه‌ی منتشرشده بدون بک‌اند اجرا می‌شود: API و WebSocketها در خود مرورگر
  // شبیه‌سازی می‌شوند، چون سرور واقعی درخواست از دامنه‌های دیگر را نمی‌پذیرد (CORS).
  mockBackend: true,
};
