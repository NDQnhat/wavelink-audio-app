export interface MembershipPackage {
  id: string;
  name: string;
  durationDays: number;
  priceVND: number;
  description: string;
}

export interface MyMembership {
  role: string;
  membership?: string;
  isVip: boolean;
  vipExpiresAt?: string | null;
  daysRemaining?: number;
  latestOrder?: MembershipOrder | null;
}

export interface MembershipOrder {
  orderCode: string;
  packageId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
  qrCodeUrl: string;
  status: string;
  expiresAt?: string;
}
