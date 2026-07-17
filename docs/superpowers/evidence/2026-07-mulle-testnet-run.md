# 물레 MULLE — GIWA Sepolia 완주 기록 (2026-07-16)

3인 계(회당 ₩500,000, 60초 주기 데모, 보증금 1회분, 온체인 제비뽑기)를
GIWA Sepolia에서 생성→참여→추첨→납입→정산→수령까지 전 사이클 완주.
최종 상태 `Completed(2)`, 계 컨트랙트 mKRW 잔액 **0** (회계 무결 종결).

## 컨트랙트 (모두 Verified)

| 컨트랙트 | 주소 |
|---|---|
| MockKRW | [0x34e78932cB132e248EEf189ed66574E9dffc18BB](https://sepolia-explorer.giwa.io/address/0x34e78932cB132e248EEf189ed66574E9dffc18BB) |
| MulleFactory | [0x41e70B75eE359A86F54daE3B342C5b876b0Cdd2e](https://sepolia-explorer.giwa.io/address/0x41e70B75eE359A86F54daE3B342C5b876b0Cdd2e) |
| 완주 데모 계 (Mulle) | [0x9409Ec65128f5Dd9686F6e739f1520170F87D85A](https://sepolia-explorer.giwa.io/address/0x9409Ec65128f5Dd9686F6e739f1520170F87D85A) |

## 참여 지갑

- A (개설자/배포자): `0xEa931dde4EE7407E6e1c77f6005F5b52fC7de2e1`
- B: `0xeD515246beFe02258f40D0deF9cDf042b5e2A973`
- C: `0x58023084d99Ec8fc0397B499027778DB71016B51`

제비뽑기 결과 순번: **A → C → B** (start 트랜잭션의 Started 이벤트)

## 트랜잭션 타임라인

| 단계 | Tx Hash |
|---|---|
| mKRW faucet (A) | `0xa9d5ec84976946b6588e8fc4cefbec2258e4aa72ebe026e25ae3605c045540b8` |
| createMulle | `0xf4a5dfd100430c9d21bf2da9780841a2e2351a713959beac6c679d8023b690d4` |
| join A | `0x9fd174ddfbc03cde4ce88b182c9d7773dcce0083f66eef33c1bb2547778c69bb` |
| join B | `0x84c1a9ca4576e2377211990230ab8dcd10ec84cf0ee6825b2c12b5492ff21a26` |
| join C | `0xefd5f1d457cb909583a21961abc8b1453651f563a5b78df477b59597f9f14c07` |
| start (온체인 제비뽑기) | `0x7f3e4d72edec3916931e60a5de898801075423cc06ce94b9847151dfbb1da833` |
| R1 pay A/B/C | `0x29ccc975…4081` / `0x72fce077…c69e` / `0x6ad7c32e…e484` |
| R1 settle | `0x98ec8b5b92b00d1464f890427d82c0c485477245c4fbec04242f14dadcf2f7b1` |
| R2 pay A/B/C | `0x0133e64b…2120` / `0x2c6ae006…3f76` / `0x5e753de1…4abf` |
| R2 settle | `0x94cbed87201083feef577276e8ad48bf8acfee3b2094761395ef503710aaf027` |
| R3 pay A/B/C | `0xba666a9b…e53c` / `0xf2e40ba7…79e0` / `0x207abe6d…7923` |
| R3 settle (완주 확정) | `0x9c833b1c1854ba96abcdf463581ab6e88feb25546246f42614878091efac1634` |
| claim A/B/C | `0xce65b477…9ff8` / `0xbfac3370…caac 접두 0xbfac3370…98ca3c` / `0x55625540…d3b8` |

## 검증 결과 (이 세션 도구 출력 기준)

- `state()` = 2 (Completed)
- `currentRound()` = 3 (전 회차 종료)
- 계 컨트랙트 mKRW 잔액 = 0
- Foundry 단위 테스트 28/28 PASS

---

# 이음 전세 에스크로 + 브리지 풀 — GIWA Sepolia 완주 기록 (2026-07-16)

집주인(A)·신규 세입자(B)·기존 세입자(C) 3자 시나리오:
전세금 ₩5,000,000 락 → 문서 앵커링 → C 브리지 선지급 ₩4,477,500 (0.5% 할인)
→ 정산일 도래 → **단일 트랜잭션 원자 정산** (풀 상환 4.5M + 집주인 차액 0.5M)
→ 최종 에스크로 잔액 0, 풀 수수료 수익 ₩22,500 (totalAssets 6,022,500).

## 컨트랙트 (Verified 제출 완료)

| 컨트랙트 | 주소 |
|---|---|
| BridgePool | [0x9f7c5453af044f4c8Ab40eC3A0DF2121cB8bFbd5](https://sepolia-explorer.giwa.io/address/0x9f7c5453af044f4c8Ab40eC3A0DF2121cB8bFbd5) |
| JeonseFactory | [0xD37eD0FBEeD8BC364982F2E60B90B48D8067DE08](https://sepolia-explorer.giwa.io/address/0xD37eD0FBEeD8BC364982F2E60B90B48D8067DE08) |
| 완주 데모 에스크로 | [0x8a29Eaae4441289482D100aEE428d1DCa99D589c](https://sepolia-explorer.giwa.io/address/0x8a29Eaae4441289482D100aEE428d1DCa99D589c) |

## 트랜잭션 타임라인

| 단계 | Tx Hash |
|---|---|
| LP 풀 예치 ₩6,000,000 | `0x5667cf62999640864f50f2ccb9374b2ae7453517a52ccf59fed981349cc68d89` |
| createEscrow (전세 5M / 반환 4.5M) | `0x0c0a817a9bc0bffc52de917d12523907b4f821751a7ed6ff2f96b070b6fd38c0` |
| B fund (전세금 락) | `0x3e003d3453e8a50ff4b2c794c13e25d777325de78a9abd76b91d76ff5b245878` |
| C 브리지 선지급 | `0x95ddf382224697331d681ee7002cb39b57a7bfaec5d811e810d689e765f32469` |
| **원자적 연쇄 정산** | `0x8e9e15adeea7793ce7a342ed97a4aa61fd5c2f770f85ca67644b1fed8257d678` |

## 검증 결과

- 정산 후 `state()` = 2 (Settled), `totalOutstanding()` = 0
- 에스크로 mKRW 잔액 = 0 (전액 분배 완료)
- 풀 totalAssets = 6,022,500 mKRW (수수료 수익 반영)
- Foundry 단위 테스트 40/40 PASS (이음 12개 포함)
