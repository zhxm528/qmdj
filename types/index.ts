export interface User {
  id: string;
  email: string;
  createdAt: string;
  subscription?: {
    plan: string;
    status: string;
    expiresAt?: string;
  };
}

export interface GridCell {
  id: number;
  name: string;
  content: string;
  star?: string;
  door?: string;
  god?: string;
}

export interface QueryResult {
  subject: string;
  date: string;
  time: string;
  grid: GridCell[];
  timestamp: string;
}

export interface SubscriptionPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
}

