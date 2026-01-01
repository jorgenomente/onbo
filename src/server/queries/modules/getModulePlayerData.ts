'use server';

import { z } from 'zod';

import type { Profile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type ModulePlayer = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

type ModuleLesson = {
  id: string;
  unit_id: string | null;
  title: string;
  order_index: number | null;
  content_json: unknown | null;
};

type ModuleUnit = {
  id: string;
  title: string;
  order_index: number | null;
  lessons: ModuleLesson[];
};

export type ModulePlayerData = {
  module: ModulePlayer | null;
  units: ModuleUnit[];
  moduleError: string | null;
  unitsError: string | null;
  lessonsError: string | null;
};

const moduleIdSchema = z.string().uuid();

export async function getModulePlayerData(
  moduleId: string,
  profile: Profile | null,
): Promise<ModulePlayerData> {
  const errorMessage = (error: unknown) => {
    if (!error) {
      return null;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      return typeof message === 'string' ? message : String(message);
    }
    return String(error);
  };
  const parsedModuleId = moduleIdSchema.safeParse(moduleId);
  if (!parsedModuleId.success) {
    return {
      module: null,
      units: [],
      moduleError: null,
      unitsError: null,
      lessonsError: null,
    };
  }

  if (!profile?.org_id) {
    return {
      module: null,
      units: [],
      moduleError: null,
      unitsError: null,
      lessonsError: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const moduleQuery = supabase
    .from('modules')
    .select('id, title, description, status')
    .eq('id', parsedModuleId.data)
    .eq('org_id', profile.org_id);

  const { data: module, error: moduleError } =
    profile.role === 'employee'
      ? await moduleQuery.eq('status', 'published').maybeSingle()
      : await moduleQuery.maybeSingle();

  if (!module) {
    return {
      module: null,
      units: [],
      moduleError: errorMessage(moduleError),
      unitsError: null,
      lessonsError: null,
    };
  }

  const { data: units, error: unitsError } = await supabase
    .from('module_units')
    .select('id, title, order_index')
    .eq('module_id', parsedModuleId.data)
    .eq('org_id', profile.org_id)
    .order('order_index', { ascending: true });

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, unit_id, title, order_index, content_json')
    .eq('module_id', parsedModuleId.data)
    .eq('org_id', profile.org_id)
    .order('order_index', { ascending: true });

  const unitList = units ?? [];
  const unitMap = new Map<string, ModuleUnit>(
    unitList.map((unit) => [
      unit.id,
      { ...unit, lessons: [] },
    ]),
  );

  (lessons ?? []).forEach((lesson) => {
    if (!lesson.unit_id) {
      return;
    }
    const unit = unitMap.get(lesson.unit_id);
    if (unit) {
      unit.lessons.push(lesson);
    }
  });

  const unitsWithLessons = Array.from(unitMap.values()).map((unit) => ({
    ...unit,
    lessons: [...unit.lessons].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
    ),
  }));

  return {
    module,
    units: unitsWithLessons,
    moduleError: errorMessage(moduleError),
    unitsError: errorMessage(unitsError),
    lessonsError: errorMessage(lessonsError),
  };
}
