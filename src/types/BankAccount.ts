// Bank account types for the game
export interface BankTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  timestamp: Date;
  description: string;
}

export interface FixedDeposit {
  id: string;
  amount: number;
  interestRate: number;
  startDate: Date;
  duration: number; // in days
  maturityDate: Date;
  matured: boolean;
  status: 'active' | 'matured' | 'claimed' | 'cancelled';
}

export interface BankAccount {
  _id?: string;
  userId: string;
  balance: number;
  transactions: BankTransaction[];
  fixedDeposits?: FixedDeposit[];
  createdAt: Date;
  lastUpdated: Date;
}