// 이전에 localhost:3000에 등록됐던 서비스워커 잔재를 정리하는 no-op 워커.
// 설치 즉시 스스로 등록 해제하고 페이지 제어를 반환한다.
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", async () => {
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((c) => c.navigate(c.url));
});
