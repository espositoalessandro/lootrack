export interface Transaction {
  uuid: string;
  category: Category;
  amount: number;
  lastUpdated: Date;
  created: Date;
  deleted: boolean;
  description?: string;
}

export enum Category {
  GOING_OUT,
  CAR,
  HEALTH,
  SUBSCRIPTION,
  TRAVEL,
  EXTRA,
}
