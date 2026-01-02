'use server';

import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { createServiceRoleClient } from '@/server/supabase/createServiceRoleClient';

const cloneSchema = z.object({
  sourceCourseId: z.string().uuid(),
  targetLocationId: z.string().uuid(),
  newCourseTitle: z.string().trim().min(3),
});

function parseAllowlist(raw: string | undefined) {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function cloneCourseToLocation(input: {
  sourceCourseId: string;
  targetLocationId: string;
  newCourseTitle: string;
}) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[cloneCourseToLocation] input', input);
  }
  const parsed = cloneSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Datos invalidos.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autorizado.');
  }

  const allowlist = parseAllowlist(process.env.ONBO_SUPERADMIN_EMAILS);
  const isSuperAdmin =
    !!user.email && allowlist.includes(user.email.toLowerCase());
  const profile = await getCurrentProfile();
  const dataClient = isSuperAdmin ? createServiceRoleClient() : supabase;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[cloneCourseToLocation] viewer', {
      userId: user.id,
      isSuperAdmin,
      viewerOrgId: profile?.org_id ?? null,
      viewerRole: profile?.role ?? null,
    });
  }

  const dbLookup = isSuperAdmin ? createServiceRoleClient() : supabase;
  const { data: location, error: locationError } = await dbLookup
    .from('locations')
    .select('id, slug, name, group_id')
    .eq('id', parsed.data.targetLocationId)
    .maybeSingle();

  if (process.env.NODE_ENV !== 'production') {
    console.log('[cloneCourseToLocation] targetLocation lookup', {
      targetLocationId: parsed.data.targetLocationId,
      found: Boolean(location),
      error: locationError?.message ?? null,
    });
  }

  if (locationError || !location) {
    throw new Error('Local no encontrado (id inválido o inexistente).');
  }

  if (!isSuperAdmin) {
    const { data: adminMembership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', location.group_id)
      .eq('user_id', user.id)
      .in('role', ['group_admin', 'group_trainer'])
      .maybeSingle();

    if (!adminMembership) {
      throw new Error('No autorizado.');
    }

    const { data: groupMembership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', location.group_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: locationMembership } = await supabase
      .from('location_memberships')
      .select('role')
      .eq('location_id', location.id)
      .eq('user_id', user.id)
      .maybeSingle();

    const canManageCourses =
      groupMembership?.role === 'group_admin' ||
      locationMembership?.role === 'location_admin' ||
      locationMembership?.role === 'trainer';

      if (!canManageCourses) {
        throw new Error('No autorizado.');
      }
  }

  const targetOrgId = profile?.org_id ?? null;
  if (!targetOrgId) {
    throw new Error('No se pudo resolver el org_id del local.');
  }

  const { data: sourceCourse } = await dataClient
    .from('courses')
    .select('id, org_id, title, description, interval_days_default, status')
    .eq('id', parsed.data.sourceCourseId)
    .maybeSingle();

  if (!sourceCourse) {
    throw new Error('Curso origen no encontrado.');
  }

  if (sourceCourse.org_id !== targetOrgId) {
    throw new Error('El curso origen no pertenece al mismo org.');
  }

  const { data: courseModules } = await dataClient
    .from('course_modules')
    .select('module_id, order_index')
    .eq('course_id', sourceCourse.id)
    .order('order_index', { ascending: true });

  const newCourseTitle = parsed.data.newCourseTitle.trim();
  const newCoursePayload: {
    org_id: string;
    title: string;
    description: string | null;
    interval_days_default: number | null;
    status?: string | null;
  } = {
    org_id: targetOrgId,
    title: newCourseTitle,
    description: sourceCourse.description ?? null,
    interval_days_default: sourceCourse.interval_days_default ?? null,
  };

  if (sourceCourse.status === 'active' || sourceCourse.status === 'archived') {
    newCoursePayload.status = sourceCourse.status;
  } else {
    newCoursePayload.status = 'active';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[courses][clone][insert]', {
      userId: user.id,
      sourceCourseId: sourceCourse.id,
      targetLocationId: location.id,
      payload: newCoursePayload,
    });
    console.trace('[courses][clone][insert] stack');
  }

  const { data: newCourse, error: newCourseError } = await dataClient
    .from('courses')
    .insert(newCoursePayload)
    .select('id')
    .single();

  if (newCourseError || !newCourse) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[courses][clone][insert][error]', {
        message: newCourseError?.message ?? null,
        code: newCourseError?.code ?? null,
        details: newCourseError?.details ?? null,
        hint: newCourseError?.hint ?? null,
      });
    }
    throw new Error(newCourseError?.message ?? 'No se pudo crear el curso.');
  }

  if (!courseModules?.length) {
    return { newCourseId: newCourse.id, newCourseTitle };
  }

  const moduleIds = courseModules.map((row) => row.module_id);
  const { data: modules } = await dataClient
    .from('modules')
    .select('id, title, description, status, order_index')
    .in('id', moduleIds);

  const moduleById = new Map(
    (modules ?? []).map((module) => [module.id, module]),
  );

  const moduleIdMap = new Map<string, string>();

  for (const courseModule of courseModules) {
    const sourceModule = moduleById.get(courseModule.module_id);
    if (!sourceModule) {
      throw new Error('Modulo origen no encontrado.');
    }

    const { data: newModule, error: newModuleError } = await dataClient
      .from('modules')
      .insert({
        org_id: targetOrgId,
        group_id: location.group_id,
        location_id: location.id,
        title: sourceModule.title,
        description: sourceModule.description ?? null,
        status: sourceModule.status,
        order_index: sourceModule.order_index ?? null,
      })
      .select('id')
      .single();

    if (newModuleError || !newModule) {
      throw new Error(
        newModuleError?.message ?? 'No se pudo clonar el modulo.',
      );
    }

    moduleIdMap.set(sourceModule.id, newModule.id);

    const { data: units } = await dataClient
      .from('module_units')
      .select('id, title, description, order_index')
      .eq('module_id', sourceModule.id)
      .order('order_index', { ascending: true });

    const unitIdMap = new Map<string, string>();
    for (const unit of units ?? []) {
      const { data: newUnit, error: newUnitError } = await dataClient
        .from('module_units')
        .insert({
          org_id: targetOrgId,
          module_id: newModule.id,
          title: unit.title,
          description: unit.description ?? null,
          order_index: unit.order_index ?? null,
        })
        .select('id')
        .single();

      if (newUnitError || !newUnit) {
        throw new Error(
          newUnitError?.message ?? 'No se pudo clonar la unidad.',
        );
      }

      unitIdMap.set(unit.id, newUnit.id);
    }

    const { data: lessons } = await dataClient
      .from('lessons')
      .select('id, title, content_json, order_index, unit_id')
      .eq('module_id', sourceModule.id)
      .order('order_index', { ascending: true });

    for (const lesson of lessons ?? []) {
      const mappedUnitId = lesson.unit_id
        ? unitIdMap.get(lesson.unit_id) ?? null
        : null;
      const { error: newLessonError } = await dataClient
        .from('lessons')
        .insert({
          org_id: targetOrgId,
          module_id: newModule.id,
          title: lesson.title,
          content_json: lesson.content_json ?? null,
          order_index: lesson.order_index ?? null,
          unit_id: mappedUnitId,
        });

      if (newLessonError) {
        throw new Error(
          newLessonError.message ?? 'No se pudo clonar la leccion.',
        );
      }
    }

    const { data: quizzes } = await dataClient
      .from('quizzes')
      .select('id, title, passing_score, status, unit_id')
      .eq('module_id', sourceModule.id);

    for (const quiz of quizzes ?? []) {
      const mappedQuizUnitId = quiz.unit_id
        ? unitIdMap.get(quiz.unit_id) ?? null
        : null;

      const { data: newQuiz, error: newQuizError } = await dataClient
        .from('quizzes')
        .insert({
          org_id: targetOrgId,
          module_id: newModule.id,
          title: quiz.title,
          passing_score: quiz.passing_score ?? null,
          status: quiz.status,
          unit_id: mappedQuizUnitId,
        })
        .select('id')
        .single();

      if (newQuizError || !newQuiz) {
        throw new Error(
          newQuizError?.message ?? 'No se pudo clonar el quiz.',
        );
      }

      const { data: questions } = await dataClient
        .from('questions')
        .select(
          'id, type, prompt, options_json, answer_json, order_index, content_json',
        )
        .eq('quiz_id', quiz.id)
        .order('order_index', { ascending: true });

      for (const question of questions ?? []) {
        const { error: newQuestionError } = await dataClient
          .from('questions')
          .insert({
            org_id: targetOrgId,
            quiz_id: newQuiz.id,
            type: question.type,
            prompt: question.prompt,
            options_json: question.options_json ?? null,
            answer_json: question.answer_json ?? null,
            order_index: question.order_index ?? null,
            content_json: question.content_json ?? null,
          });

        if (newQuestionError) {
          throw new Error(
            newQuestionError.message ?? 'No se pudo clonar la pregunta.',
          );
        }
      }
    }

    const { data: resources } = await dataClient
      .from('module_resources')
      .select('id, title, type, url, description, order_index')
      .eq('module_id', sourceModule.id)
      .order('order_index', { ascending: true });

    for (const resource of resources ?? []) {
      const { error: newResourceError } = await dataClient
        .from('module_resources')
        .insert({
          org_id: targetOrgId,
          module_id: newModule.id,
          title: resource.title,
          type: resource.type,
          url: resource.url,
          description: resource.description ?? null,
          order_index: resource.order_index ?? null,
        });

      if (newResourceError) {
        throw new Error(
          newResourceError.message ?? 'No se pudo clonar el recurso.',
        );
      }
    }
  }

  for (const courseModule of courseModules) {
    const mappedModuleId = moduleIdMap.get(courseModule.module_id);
    if (!mappedModuleId) {
      throw new Error('No se pudo mapear el modulo clonado.');
    }

    const { error: courseModuleError } = await dataClient
      .from('course_modules')
      .insert({
        org_id: targetOrgId,
        course_id: newCourse.id,
        module_id: mappedModuleId,
        order_index: courseModule.order_index ?? null,
      });

    if (courseModuleError) {
      throw new Error(
        courseModuleError.message ?? 'No se pudo clonar la relacion del curso.',
      );
    }
  }

  return { newCourseId: newCourse.id, newCourseTitle };
}
