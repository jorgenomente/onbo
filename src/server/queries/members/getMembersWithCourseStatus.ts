'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

type MemberProfile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
};

type AssignmentRow = {
  id: string;
  user_id: string;
  module_id: string;
  due_date: string | null;
  status: string;
  created_at: string;
};

type ModuleRow = {
  id: string;
  title: string;
  status: string;
};

type LessonRow = {
  id: string;
  module_id: string;
};

type ProgressRow = {
  user_id: string;
  module_id: string;
  completed_at: string;
};

export type MemberCourseStatus = {
  assignment_id: string;
  module_id: string;
  module_title: string;
  module_status: string;
  status: string;
  due_date: string | null;
  assigned_at: string;
  completed_lessons: number;
  total_lessons: number;
  last_activity: string | null;
};

export type MemberWithCourses = {
  member: MemberProfile;
  courses: MemberCourseStatus[];
};

export async function getMembersWithCourseStatus(orgId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, email, role, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  const members = profiles ?? [];
  const userIds = members.map((member) => member.user_id);

  if (userIds.length === 0) {
    return [] as MemberWithCourses[];
  }

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, user_id, module_id, due_date, status, created_at')
    .eq('org_id', orgId)
    .in('user_id', userIds);

  const assignmentRows = assignments ?? [];
  const moduleIds = Array.from(
    new Set(assignmentRows.map((assignment) => assignment.module_id)),
  );

  const { data: modules } =
    moduleIds.length > 0
      ? await supabase
          .from('modules')
          .select('id, title, status')
          .eq('org_id', orgId)
          .in('id', moduleIds)
      : { data: [] as ModuleRow[] };

  const { data: lessons } =
    moduleIds.length > 0
      ? await supabase
          .from('lessons')
          .select('id, module_id')
          .eq('org_id', orgId)
          .in('module_id', moduleIds)
      : { data: [] as LessonRow[] };

  const { data: progress } =
    moduleIds.length > 0 && userIds.length > 0
      ? await supabase
          .from('progress')
          .select('user_id, module_id, completed_at')
          .eq('org_id', orgId)
          .in('module_id', moduleIds)
          .in('user_id', userIds)
      : { data: [] as ProgressRow[] };

  const moduleMap = new Map<string, ModuleRow>(
    (modules ?? []).map((module) => [module.id, module]),
  );
  const lessonCounts = (lessons ?? []).reduce<Record<string, number>>(
    (acc, lesson) => {
      acc[lesson.module_id] = (acc[lesson.module_id] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const progressByUserModule = (progress ?? []).reduce<
    Record<string, { count: number; lastActivity: string | null }>
  >((acc, row) => {
    const key = `${row.user_id}:${row.module_id}`;
    const current = acc[key] ?? { count: 0, lastActivity: null };
    const nextLast =
      current.lastActivity && current.lastActivity > row.completed_at
        ? current.lastActivity
        : row.completed_at;
    acc[key] = { count: current.count + 1, lastActivity: nextLast };
    return acc;
  }, {});

  const coursesByUser = assignmentRows.reduce<Record<string, MemberCourseStatus[]>>(
    (acc, assignment) => {
      const module = moduleMap.get(assignment.module_id);
      const key = `${assignment.user_id}:${assignment.module_id}`;
      const progressInfo = progressByUserModule[key] ?? {
        count: 0,
        lastActivity: null,
      };
      const totalLessons = lessonCounts[assignment.module_id] ?? 0;

      const course: MemberCourseStatus = {
        assignment_id: assignment.id,
        module_id: assignment.module_id,
        module_title: module?.title ?? assignment.module_id,
        module_status: module?.status ?? 'unknown',
        status: assignment.status,
        due_date: assignment.due_date,
        assigned_at: assignment.created_at,
        completed_lessons: progressInfo.count,
        total_lessons: totalLessons,
        last_activity: progressInfo.lastActivity,
      };

      acc[assignment.user_id] = acc[assignment.user_id] ?? [];
      acc[assignment.user_id].push(course);
      return acc;
    },
    {},
  );

  return members.map((member) => ({
    member,
    courses: coursesByUser[member.user_id] ?? [],
  }));
}
