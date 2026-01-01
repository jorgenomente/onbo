create or replace function public.get_location_member_course_stats(
  p_location_id uuid
)
returns table (
  user_id uuid,
  course_id uuid,
  lessons_total int,
  lessons_completed int,
  progress_pct numeric,
  last_activity timestamptz,
  final_quiz_status text,
  final_quiz_best_score numeric,
  final_quiz_passed boolean,
  final_quiz_last_attempt timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_group_id uuid;
  v_is_allowed boolean;
begin
  select l.group_id
    into v_group_id
  from public.locations l
  where l.id = p_location_id;

  if v_group_id is null then
    raise exception 'location not found';
  end if;

  select (
    exists (
      select 1
      from public.group_memberships gm
      where gm.group_id = v_group_id
        and gm.user_id = auth.uid()
        and gm.role = 'group_admin'
    )
    or exists (
      select 1
      from public.location_memberships lm
      where lm.location_id = p_location_id
        and lm.user_id = auth.uid()
        and lm.role in ('location_admin', 'trainer')
    )
  )
    into v_is_allowed;

  if not v_is_allowed then
    raise exception 'not allowed';
  end if;

  return query
  with members as (
    select lm.user_id
    from public.location_memberships lm
    where lm.location_id = p_location_id
  ),
  assigned_courses as (
    select ca.user_id, ca.module_id as course_id
    from public.course_assignments ca
    where ca.location_id = p_location_id
  ),
  progress_courses as (
    select p.user_id, p.module_id as course_id
    from public.progress p
    join public.modules m on m.id = p.module_id
    where m.location_id = p_location_id
  ),
  quiz_courses as (
    select qa.user_id, q.module_id as course_id
    from public.quiz_attempts qa
    join public.quizzes q on q.id = qa.quiz_id
    join public.modules m on m.id = q.module_id
    where m.location_id = p_location_id
  ),
  scoped_courses as (
    select distinct c.user_id, c.course_id
    from (
      select * from assigned_courses
      union all
      select * from progress_courses
      union all
      select * from quiz_courses
    ) c
    join public.modules m on m.id = c.course_id
    where m.location_id = p_location_id
  ),
  lessons_totals as (
    select l.module_id as course_id, count(*)::int as lessons_total
    from public.lessons l
    join public.modules m on m.id = l.module_id
    where m.location_id = p_location_id
    group by l.module_id
  ),
  progress_agg as (
    select p.user_id,
           p.module_id as course_id,
           count(*) filter (where p.status = 'done')::int as lessons_completed,
           max(p.updated_at) as last_activity
    from public.progress p
    join public.modules m on m.id = p.module_id
    where m.location_id = p_location_id
    group by p.user_id, p.module_id
  ),
  quiz_agg as (
    select qa.user_id,
           q.module_id as course_id,
           max(qa.score)::numeric as best_score,
           bool_or(qa.passed) as passed,
           max(qa.created_at) as last_attempt
    from public.quiz_attempts qa
    join public.quizzes q on q.id = qa.quiz_id
    join public.modules m on m.id = q.module_id
    where m.location_id = p_location_id
    group by qa.user_id, q.module_id
  )
  select sc.user_id,
         sc.course_id,
         coalesce(lt.lessons_total, 0) as lessons_total,
         coalesce(pa.lessons_completed, 0) as lessons_completed,
         case
           when coalesce(lt.lessons_total, 0) > 0
             then round((coalesce(pa.lessons_completed, 0)::numeric / lt.lessons_total) * 100, 2)
           else 0
         end as progress_pct,
         pa.last_activity,
         case
           when qa.last_attempt is null then 'not_started'
           else 'completed'
         end as final_quiz_status,
         qa.best_score as final_quiz_best_score,
         qa.passed as final_quiz_passed,
         qa.last_attempt as final_quiz_last_attempt
  from scoped_courses sc
  left join lessons_totals lt on lt.course_id = sc.course_id
  left join progress_agg pa on pa.user_id = sc.user_id and pa.course_id = sc.course_id
  left join quiz_agg qa on qa.user_id = sc.user_id and qa.course_id = sc.course_id;
end;
$$;

create index if not exists progress_org_user_updated_idx
  on public.progress(org_id, user_id, updated_at desc);

create index if not exists quiz_attempts_org_user_quiz_idx
  on public.quiz_attempts(org_id, user_id, quiz_id);

create index if not exists quiz_attempts_org_quiz_created_idx
  on public.quiz_attempts(org_id, quiz_id, created_at desc);
