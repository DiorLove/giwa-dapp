import { redirect } from "next/navigation";

// 브리지 풀은 이음 Earn 통합 유동성 풀로 융화됨 — /earn 으로 이동
export default function PoolRedirect() {
  redirect("/earn");
}
