/**
 * Centralized TypeScript types aligned to the Supabase database schema.
 * Shared by both App User and App Console.
 *
 * ⚠️  Do NOT use generic `string` for status/enum columns.
 *     Always use the strict union types defined here.
 */

// ─── Enums (mirrored from DB) ────────────────────────────────────────

export type UserRole = 'admin' | 'partner' | 'manager' | 'user';
export type StationStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'MAINTENANCE';
export type VisibilityType = 'PUBLIC' | 'RESTRICTED' | 'HIDDEN';
export type PaymentMethodType = 'STRIPE' | 'CREDITS' | 'HYBRID';
export type TransactionTypeEnum = 'CREDIT_TOPUP' | 'WASH_SERVICE' | 'GUEST_WASH';

// ─── Application-level status unions (not DB enums, but constrained values) ──

export type WashSessionStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
export type WashSessionStep = 'timer' | 'sanitize' | 'courtesy' | 'rating' | 'done';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type FiscalStatus = 'TO_SEND' | 'SENT' | 'ERROR' | 'NOT_REQUIRED';
export type ReceiptStatus = 'PENDING' | 'SENT' | 'ERROR';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete';
export type MaintenanceStatus = 'open' | 'in_progress' | 'risolto';
export type MaintenanceSeverity = 'low' | 'medium' | 'high';
export type GateCommandType = 'OPEN' | 'CLOSE';
export type GateCommandStatus = 'PENDING' | 'SENT' | 'ACKNOWLEDGED';

// ─── Table interfaces ────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: UserRole | null;
  stripe_customer_id: string | null;
  created_at: string | null;
  must_change_password: boolean | null;
  vat_number: string | null;
  fiscal_code: string | null;
  legal_name: string | null;
  fiskaly_system_id: string | null;
}

export interface WashSession {
  id: string;
  station_id: string;
  user_id: string | null;
  option_id: number;
  option_name: string;
  total_seconds: number;
  started_at: string;
  ends_at: string;
  created_at: string;
  status: WashSessionStatus;
  step: WashSessionStep;
  stripe_session_id: string | null;
  guest_email: string | null;
}

export interface Transaction {
  id: string;
  user_id: string | null;
  station_id: string | null;
  structure_id: string | null;
  total_value: number;
  transaction_type: TransactionTypeEnum;
  payment_method: PaymentMethodType | null;
  status: TransactionStatus | null;
  stripe_payment_id: string | null;
  credits_purchased: number | null;
  amount_paid_stripe: number | null;
  amount_paid_wallet: number | null;
  guest_email: string | null;
  fiscal_status: FiscalStatus | null;
  fiscal_doc_url: string | null;
  fiscal_error_log: string | null;
  created_at: string | null;
}

export interface TransactionReceipt {
  id: string;
  session_id: string | null;
  partner_id: string;
  amount: number;
  tax_rate: number;
  status: ReceiptStatus;
  fiskaly_record_id: string | null;
  error_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerFiscalData {
  profile_id: string;
  vat_number: string;
  business_name: string;
  sdi_code: string | null;
  fiscal_api_credentials: Record<string, unknown> | null;
  is_active: boolean | null;
}

export interface SubscriptionPlan {
  id: string;
  owner_id: string;
  structure_id: string | null;
  name: string;
  description: string | null;
  price_eur: number;
  interval: string;
  max_washes_per_month: number | null;
  is_active: boolean | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  created_at: string | null;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  starts_at: string;
  ends_at: string | null;
  washes_used_this_period: number | null;
  current_period_start: string | null;
  stripe_subscription_id: string | null;
  created_at: string | null;
  // Joined
  plan?: SubscriptionPlan;
}

export interface MaintenanceLog {
  id: string;
  station_id: string | null;
  performed_by: string | null;
  reason: string | null;
  notes: string | null;
  severity: MaintenanceSeverity | null;
  status: MaintenanceStatus | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
}

export interface GateCommand {
  id: string;
  station_id: string;
  user_id: string | null;
  command: GateCommandType;
  status: GateCommandStatus;
  created_at: string;
}

export interface CreditPackage {
  id: string;
  name: string | null;
  credits_value: number;
  price_eur: number;
  owner_id: string | null;
  structure_id: string | null;
  is_active: boolean | null;
}

export interface Structure {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  image_url: string | null;
  owner_id: string | null;
  created_at: string | null;
}

export interface StructureWallet {
  id: string;
  user_id: string | null;
  structure_id: string | null;
  balance: number | null;
  updated_at: string | null;
}
