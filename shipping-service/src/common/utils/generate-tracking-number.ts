export function generateTrackingNumber(): string {
  const random = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString().slice(-6);
  return `TRK-${timestamp}-${random}`.toUpperCase();
}
