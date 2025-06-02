import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isBrowser = () => typeof window !== "undefined";

const getPiecesForStyle = (style: string): Record<string, any> => {
  // Only support 'governer' for now
  return {
    WK: `/styles/${style}/kw.svg`,
    BK: `/styles/${style}/kb.svg`,
    WQ: `/styles/${style}/qw.svg`,
    BQ: `/styles/${style}/qb.svg`,
    WR: `/styles/${style}/rw.svg`,
    BR: `/styles/${style}/rb.svg`,
    WB: `/styles/${style}/bw.svg`,
    BB: `/styles/${style}/bb.svg`,
    WN: `/styles/${style}/nw.svg`,
    BN: `/styles/${style}/nb.svg`,
    WP: `/styles/${style}/pw.svg`,
    BP: `/styles/${style}/pb.svg`,
  };
};

export const getPiece = (style: string, piece: string) => {
  const pieces = getPiecesForStyle(style);
  return pieces[piece] || null;
};
