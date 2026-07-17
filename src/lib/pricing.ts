/**
 * Pricing & plan constants cho Phòng Kín
 * Đơn vị tiền: VND
 */

export const PRICING = {
  '10_2': 10000,
  '10_5': 20000,
  '10_10': 35000,
  '10_20': 60000,
  '30_2': 25000,
  '30_5': 40000,
  '30_10': 65000,
  '30_20': 100000,
  '60_2': 40000,
  '60_5': 65000,
  '60_10': 100000,
  '60_20': 150000,
  '120_2': 65000,
  '120_5': 100000,
  '120_10': 150000,
  '120_20': 250000,
} as const;

export type PricingKey = keyof typeof PRICING;

export const DURATION_LABELS = {
  10: '10 phút',
  30: '30 phút',
  60: '1 giờ',
  120: '2 giờ',
} as const;

export const MEMBER_LIMITS = [2, 5, 10, 20] as const;

export type Duration = keyof typeof DURATION_LABELS;
export type MaxMembers = (typeof MEMBER_LIMITS)[number];

export const DURATION_MINUTES: Record<Duration, number> = {
  10: 10,
  30: 30,
  60: 60,
  120: 120,
};

export function getPrice(duration: Duration, maxMembers: MaxMembers): number {
  const key = `${duration}_${maxMembers}` as PricingKey;
  return PRICING[key];
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export const PAYMENT_TTL_SECONDS = 10 * 60;

export const TERMS_VERSION = '1.0.0';

/**
 * Bypass thanh toán SePay — chỉ dùng cho DEV/TEST khi chưa có đủ config bên SePay.
 * Khi bật (true), bấm "Mua" sẽ tự động tạo phòng + redirect vào phòng luôn.
 * Bật bằng cách set env BYPASS_PAYMENT=true trong .env.
 */
export const BYPASS_PAYMENT = process.env.BYPASS_PAYMENT === 'true';
