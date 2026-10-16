export interface MembershipPackage {
  id: string;
  name: string;
  durationDays: number;
  priceVND: number;
  amount?: number;
  description: string;
  originalCost?: number;
  discount?: string;
  perks?: string[];
  isLocked?: boolean;
  isCurrent?: boolean;
  canUpgrade?: boolean;
}

export interface PaymentInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  notePrefix?: string;
}

export interface MyMembership {
  userId?: number;
  username?: string;
  role: string;
  membership?: string;
  isVip: boolean;
  vipExpiresAt?: string | null;
  daysRemaining?: number;
  latestOrder?: MembershipOrder | null;
}

export interface MembershipOrder {
  id?: number;
  orderCode: string;
  userId?: number;
  packageId: string;
  packageName?: string;
  amount: number;
  priceVND?: number;
  durationDays?: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
  qrCodeUrl: string;
  status: string;
  expiresAt?: string;
  createdAt?: string;
}
