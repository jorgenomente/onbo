type InviteRow = {
  id: string;
  email: string;
  status: string;
  created_at?: string | null;
};

type MembershipRow = {
  user_id: string;
  role: string;
  created_at?: string | null;
};

type LifecycleWarning = {
  type: string;
  message: string;
  user_id?: string;
  email?: string;
};

type InvitationLifecycle =
  | 'pending'
  | 'accepted_not_member'
  | 'accepted_member'
  | 'pending_but_member'
  | 'revoked'
  | 'needs_review';

type ActiveLifecycle =
  | 'active_ok'
  | 'active_no_invite'
  | 'active_invite_revoked'
  | 'active_invite_pending'
  | 'active_needs_review';

type MergeResult = {
  invitationRows: Array<{ inviteId: string; email: string; status: InvitationLifecycle }>;
  activeRows: Array<{ userId: string; status: ActiveLifecycle }>;
  warnings: LifecycleWarning[];
};

function normalizeEmail(value?: string | null) {
  return value ? value.trim().toLowerCase() : '';
}

function sortInvites(invites: InviteRow[]) {
  return [...invites].sort((a, b) => {
    const aTime = a.created_at ?? '';
    const bTime = b.created_at ?? '';
    return bTime.localeCompare(aTime);
  });
}

export function mergeMemberLifecycle(input: {
  invites: InviteRow[];
  memberships: MembershipRow[];
  emailByUserId: Map<string, string | null>;
}): MergeResult {
  const { invites, memberships, emailByUserId } = input;
  const warnings: LifecycleWarning[] = [];

  const membershipByEmail = new Map<string, MembershipRow>();
  memberships.forEach((member) => {
    const email = normalizeEmail(emailByUserId.get(member.user_id));
    if (email) {
      membershipByEmail.set(email, member);
    }
  });

  const invitesByEmail = new Map<string, InviteRow[]>();
  invites.forEach((invite) => {
    const email = normalizeEmail(invite.email);
    if (!email) {
      return;
    }
    const list = invitesByEmail.get(email) ?? [];
    list.push(invite);
    invitesByEmail.set(email, list);
  });

  const invitationRows = invites.map((invite) => {
    const email = normalizeEmail(invite.email);
    const member = email ? membershipByEmail.get(email) : undefined;
    let status: InvitationLifecycle = 'needs_review';

    if (invite.status === 'revoked') {
      status = 'revoked';
    } else if (invite.status === 'pending') {
      status = member ? 'pending_but_member' : 'pending';
    } else if (invite.status === 'accepted') {
      status = member ? 'accepted_member' : 'accepted_not_member';
    } else {
      status = member ? 'accepted_member' : 'needs_review';
    }

    if (status === 'accepted_not_member') {
      warnings.push({
        type: status,
        email: invite.email,
        message: 'Invitacion aceptada pero sin membership.',
      });
    }
    if (status === 'pending_but_member') {
      warnings.push({
        type: status,
        email: invite.email,
        message: 'Invitacion pendiente pero ya es miembro.',
      });
    }

    return {
      inviteId: invite.id,
      email: invite.email,
      status,
    };
  });

  const activeRows = memberships.map((member) => {
    const email = normalizeEmail(emailByUserId.get(member.user_id));
    const inviteList = email ? sortInvites(invitesByEmail.get(email) ?? []) : [];
    const invite = inviteList[0];
    let status: ActiveLifecycle = 'active_needs_review';

    if (!invite) {
      status = 'active_no_invite';
    } else if (invite.status === 'revoked') {
      status = 'active_invite_revoked';
    } else if (invite.status === 'pending') {
      status = 'active_invite_pending';
    } else if (invite.status === 'accepted') {
      status = 'active_ok';
    } else {
      status = 'active_needs_review';
    }

    if (status === 'active_no_invite') {
      warnings.push({
        type: status,
        user_id: member.user_id,
        email: email || undefined,
        message: 'Miembro sin invitacion asociada.',
      });
    }
    if (status === 'active_invite_revoked') {
      warnings.push({
        type: status,
        user_id: member.user_id,
        email: email || undefined,
        message: 'Miembro activo pero invitacion revocada.',
      });
    }
    if (status === 'active_invite_pending') {
      warnings.push({
        type: status,
        user_id: member.user_id,
        email: email || undefined,
        message: 'Miembro activo con invitacion pendiente.',
      });
    }

    return { userId: member.user_id, status };
  });

  return { invitationRows, activeRows, warnings };
}
