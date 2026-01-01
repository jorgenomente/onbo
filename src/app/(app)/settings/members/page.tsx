import { redirect } from 'next/navigation';

import { getCurrentProfile } from '@/lib/auth';
import { isAdminLike } from '@/lib/rbac';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revokeInvite } from '@/server/actions/invites/revokeInvite';
import { assignCourse } from '@/server/actions/assignments/assignCourse';
import { removeMemberAssignment } from '@/server/actions/assignments/removeMemberAssignment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getMembersWithCourseStatus } from '@/server/queries/members/getMembersWithCourseStatus';
import { getMemberCoursesStatus } from '@/server/queries/admin/getMemberCoursesStatus';
import { listModulesForAdmin } from '@/server/queries/modules/listModulesForAdmin';

import InviteEmployeeForm from './InviteEmployeeForm';
import PendingInviteRow from './PendingInviteRow';
import PasswordResetButton from './PasswordResetButton';
import MemberCoursesDialog from './MemberCoursesDialog';

export default async function MembersPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isAdminLike(profile.role)) {
    redirect('/home');
  }

  if (!profile.org_id) {
    redirect('/home');
  }

  const supabase = await createSupabaseServerClient();
  const members = await getMembersWithCourseStatus(profile.org_id);
  if (process.env.NODE_ENV !== 'production') {
    console.log('[members] profiles count', members.length);
  }

  const memberCourses = await Promise.all(
    members.map(({ member }) => getMemberCoursesStatus(member.user_id)),
  );

  const modules = await listModulesForAdmin(profile.org_id);

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, interval_days_default, status')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  const activeCourses = (courses ?? []).filter(
    (course) => course.status === 'active',
  );

  const { data: invites } = await supabase
    .from('organization_invites')
    .select('id, email, status, created_at, invited_user_id, last_sent_at, send_count')
    .eq('org_id', profile.org_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Miembros</h1>
        <p className="text-sm text-muted-foreground">
          Gestioná integrantes e invitaciones.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Invitar employee</h2>
        <InviteEmployeeForm courses={activeCourses} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Miembros actuales ({members.length})
        </h2>
        <div className="space-y-2">
          {members.length ? (
            members.map(({ member, courses }, index) => (
              <div
                key={member.user_id}
                className="flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {member.full_name ??
                        member.email ??
                        member.user_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.role}
                      {member.email ? ` · ${member.email}` : ' · Email no disponible'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.full_name
                        ? `Nombre: ${member.full_name}`
                        : 'Nombre: Sin nombre'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {member.user_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Creado: {new Date(member.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <MemberCoursesDialog
                    memberName={member.full_name ?? member.email ?? member.user_id}
                    memberUserId={member.user_id}
                    courses={memberCourses[index] ?? []}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <PasswordResetButton
                    userId={member.user_id}
                    email={member.email}
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Cursos</h3>
                  {memberCourses[index]?.length ? (
                    <div className="space-y-2">
                      {memberCourses[index].map((course) => (
                        <div
                          key={course.moduleId}
                          className="flex flex-col gap-2 rounded-md border px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{course.moduleTitle}</span>
                            <span className="text-muted-foreground">
                              {course.moduleStatus}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            Progreso: {course.progress.doneCount}/
                            {course.progress.totalCount} ({course.progress.percent}%)
                          </div>
                          <div className="text-muted-foreground">
                            Due date: {course.dueDate ?? '—'}
                          </div>
                          <div className="text-muted-foreground">
                            Último score:{' '}
                            {course.finalQuiz?.latestAttempt
                              ? `${course.finalQuiz.latestAttempt.score}%`
                              : 'Pendiente'}
                          </div>
                          <form
                            action={async (formData) => {
                              await removeMemberAssignment(formData);
                            }}
                          >
                            <input
                              type="hidden"
                              name="member_user_id"
                              value={member.user_id}
                            />
                            <input
                              type="hidden"
                              name="module_id"
                              value={course.moduleId}
                            />
                            <Button type="submit" size="sm" variant="outline">
                              Remover del curso
                            </Button>
                          </form>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Sin cursos asignados.
                    </p>
                  )}
                </div>
                <form
                  action={async (formData) => {
                    await assignCourse(formData);
                  }}
                  className="flex flex-wrap gap-2"
                >
                  <input
                    type="hidden"
                    name="member_user_id"
                    value={member.user_id}
                  />
                  <select
                    name="module_id"
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Asignar curso</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`due_${member.user_id}`} className="text-xs">
                      Due date
                    </Label>
                    <Input
                      id={`due_${member.user_id}`}
                      name="due_date"
                      type="date"
                      className="h-9 w-36"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="outline">
                    Asignar
                  </Button>
                </form>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay miembros todavía.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Invitaciones pendientes</h2>
        <div className="space-y-2">
          {invites?.length ? (
            invites.map((invite) => (
              <PendingInviteRow key={invite.id} invite={invite}>
                <form action={revokeInvite} className="flex items-center gap-2">
                  <input type="hidden" name="invite_id" value={invite.id} />
                  {invite.invited_user_id ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="delete_auth_user"
                        value="true"
                      />
                      Eliminar usuario
                    </label>
                  ) : null}
                  <Button type="submit" size="sm" variant="destructive">
                    Cancelar
                  </Button>
                </form>
              </PendingInviteRow>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay invitaciones pendientes.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
