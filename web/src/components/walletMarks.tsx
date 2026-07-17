import type { ReactNode } from "react";

/** 미설치(미감지) 상태에서도 항상 보이는 지갑 브랜드 아이콘.
 *  데스크톱에서 EIP-6963 이 공식 아이콘을 주면 그걸 쓰고, 없으면(특히 모바일) 이 마크로 폴백한다. */
export const WALLET_MARKS: Record<string, ReactNode> = {
  MetaMask: (
    <svg viewBox="0 0 28 28" className="h-8 w-8">
      <rect width="28" height="28" rx="7" fill="#fff" />
      <g fill="#e2761b">
        <path d="M7.4 7 12.4 10.6 11.2 7.4Z" />
        <path d="M20.6 7 15.6 10.6 16.8 7.4Z" />
        <path d="M8.8 10.4 19.2 10.4 18 14.6 15.9 16.7 14 15.8 12.1 16.7 10 14.6Z" />
      </g>
      <g fill="#763d16">
        <circle cx="11.7" cy="12.9" r="0.95" />
        <circle cx="16.3" cy="12.9" r="0.95" />
      </g>
      <path d="M12.1 16.7 14 15.8 15.9 16.7 14 20.4Z" fill="#cd6116" />
      <path d="M13.4 15.9 14.6 15.9 14 18.8Z" fill="#f6f0ea" />
    </svg>
  ),
  "OKX Wallet": (
    <svg viewBox="0 0 28 28" className="h-8 w-8">
      <rect width="28" height="28" rx="7" fill="#000" />
      <g fill="#fff">
        <rect x="7" y="7" width="4.2" height="4.2" rx="0.6" />
        <rect x="16.8" y="7" width="4.2" height="4.2" rx="0.6" />
        <rect x="11.9" y="11.9" width="4.2" height="4.2" rx="0.6" />
        <rect x="7" y="16.8" width="4.2" height="4.2" rx="0.6" />
        <rect x="16.8" y="16.8" width="4.2" height="4.2" rx="0.6" />
      </g>
    </svg>
  ),
  Phantom: (
    <svg viewBox="0 0 28 28" className="h-8 w-8">
      <rect width="28" height="28" rx="7" fill="#ab9ff2" />
      <path
        fill="#fff"
        d="M21.3 14.2c0-4-3.2-7.2-7.1-7.2S7 10.2 7 14.2v3.5c0 .5.5.8 1 .6l1.5-.9 1.6 1 1.7-1 1.7 1 1.7-1 1.6 1 1.4.8c.4.2 1-.1 1-.6Z"
      />
      <circle cx="12" cy="13.4" r="1.25" fill="#ab9ff2" />
      <circle cx="16" cy="13.4" r="1.25" fill="#ab9ff2" />
    </svg>
  ),
  "Binance Wallet": (
    <svg viewBox="0 0 28 28" className="h-8 w-8">
      <rect width="28" height="28" rx="7" fill="#0b0e11" />
      <g fill="#f3ba2f">
        <polygon points="14,6.4 16.1,8.5 14,10.6 11.9,8.5" />
        <polygon points="14,17.4 16.1,19.5 14,21.6 11.9,19.5" />
        <polygon points="8.5,11.9 10.6,14 8.5,16.1 6.4,14" />
        <polygon points="19.5,11.9 21.6,14 19.5,16.1 17.4,14" />
        <polygon points="14,11 17,14 14,17 11,14" />
      </g>
    </svg>
  ),
  "Rabby Wallet": (
    <svg viewBox="0 0 28 28" className="h-8 w-8">
      <defs>
        <linearGradient id="rabby-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8697ff" />
          <stop offset="1" stopColor="#5c6cf5" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="7" fill="url(#rabby-g)" />
      <path
        fill="#fff"
        d="M20.4 15.6c.6-1 .2-2-.9-2.8-1-.8-2.3-1.2-3.4-.7-.7-.6-1.6-1-2.7-1-2.6 0-4.7 2-4.7 4.3 0 .5.4.8.9.7 2-.5 3.1.3 3.9 1.2.6.7 1.6 1.3 3 1.3 1.8 0 3.3-1 3.9-2.4.2-.5-.3-.9-.8-.7-.4.2-.9.3-1.4.3.9-.3 1.6-.9 2.1-1.6Z"
      />
      <circle cx="16.4" cy="13.6" r="0.7" fill="#5c6cf5" />
    </svg>
  ),
  Rainbow: (
    <svg viewBox="0 0 28 28" className="h-8 w-8">
      <rect width="28" height="28" rx="7" fill="#174299" />
      <g fill="none">
        <path d="M21.5 21.5A15 15 0 0 0 6.5 6.5" stroke="#ff4000" strokeWidth="2.4" />
        <path d="M18.1 21.5A11.6 11.6 0 0 0 6.5 9.9" stroke="#ff9601" strokeWidth="2.4" />
        <path d="M14.7 21.5A8.2 8.2 0 0 0 6.5 13.3" stroke="#ffd426" strokeWidth="2.4" />
        <path d="M11.3 21.5A4.8 4.8 0 0 0 6.5 16.7" stroke="#00d95f" strokeWidth="2.4" />
      </g>
      <circle cx="6.5" cy="21.5" r="1.7" fill="#001e59" />
    </svg>
  ),
};
