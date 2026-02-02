export type GroupRole = 'admin' | 'member';

export interface FinancialGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  can_manage_accounts: boolean;
  can_manage_transactions: boolean;
  can_manage_cards: boolean;
  can_manage_reminders: boolean;
  can_manage_categories: boolean;
  can_view_reports: boolean;
  joined_at: string;
  updated_at: string;
  // Joined data
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  email?: string;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  invited_email: string;
  invited_by: string;
  role: GroupRole;
  can_manage_accounts: boolean;
  can_manage_transactions: boolean;
  can_manage_cards: boolean;
  can_manage_reminders: boolean;
  can_manage_categories: boolean;
  can_view_reports: boolean;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface GroupPermissions {
  can_manage_accounts: boolean;
  can_manage_transactions: boolean;
  can_manage_cards: boolean;
  can_manage_reminders: boolean;
  can_manage_categories: boolean;
  can_view_reports: boolean;
}

export const DEFAULT_MEMBER_PERMISSIONS: GroupPermissions = {
  can_manage_accounts: false,
  can_manage_transactions: false,
  can_manage_cards: false,
  can_manage_reminders: false,
  can_manage_categories: false,
  can_view_reports: true,
};

export const FULL_PERMISSIONS: GroupPermissions = {
  can_manage_accounts: true,
  can_manage_transactions: true,
  can_manage_cards: true,
  can_manage_reminders: true,
  can_manage_categories: true,
  can_view_reports: true,
};
