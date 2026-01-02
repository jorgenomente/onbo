DO $$
DECLARE
  v_target_org uuid := '84ec5291-c221-4af2-922f-912013b59a7a';
  v_location_id uuid;
  v_old_org uuid;
  v_course_id uuid;
BEGIN
  -- 1) location tigremorado
  SELECT id INTO v_location_id
  FROM public.locations
  WHERE slug = 'tigremorado'
  LIMIT 1;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'No existe location slug=tigremorado';
  END IF;

  -- 2) old org (desde modules)
  SELECT org_id INTO v_old_org
  FROM public.modules
  WHERE location_id = v_location_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_old_org IS NULL THEN
    RAISE EXCEPTION 'No hay modules en tigremorado para inferir org';
  END IF;

  IF v_old_org = v_target_org THEN
    RAISE NOTICE 'tigremorado ya esta en target org, no-op';
    RETURN;
  END IF;

  -- 3) Update modules
  UPDATE public.modules
  SET org_id = v_target_org
  WHERE location_id = v_location_id
    AND org_id = v_old_org;

  -- 4) Update module_units / lessons / quizzes / resources
  UPDATE public.module_units mu
  SET org_id = v_target_org
  FROM public.modules m
  WHERE mu.module_id = m.id
    AND m.location_id = v_location_id
    AND mu.org_id = v_old_org;

  UPDATE public.lessons l
  SET org_id = v_target_org
  FROM public.modules m
  WHERE l.module_id = m.id
    AND m.location_id = v_location_id
    AND l.org_id = v_old_org;

  UPDATE public.quizzes q
  SET org_id = v_target_org
  FROM public.modules m
  WHERE q.module_id = m.id
    AND m.location_id = v_location_id
    AND q.org_id = v_old_org;

  UPDATE public.module_resources r
  SET org_id = v_target_org
  FROM public.modules m
  WHERE r.module_id = m.id
    AND m.location_id = v_location_id
    AND r.org_id = v_old_org;

  -- 5) Update questions por quizzes del tigremorado
  UPDATE public.questions qu
  SET org_id = v_target_org
  FROM public.quizzes q
  JOIN public.modules m ON m.id = q.module_id
  WHERE qu.quiz_id = q.id
    AND m.location_id = v_location_id
    AND qu.org_id = v_old_org;

  -- 6) Mover el course template "Introduccion a la marca" a target org
  SELECT id INTO v_course_id
  FROM public.courses
  WHERE org_id = v_old_org
    AND lower(title) = lower('Introducción a la marca')
  LIMIT 1;

  IF v_course_id IS NOT NULL THEN
    UPDATE public.courses
    SET org_id = v_target_org
    WHERE id = v_course_id;

    UPDATE public.course_modules
    SET org_id = v_target_org
    WHERE course_id = v_course_id
      AND org_id = v_old_org;
  END IF;

  RAISE NOTICE 'Migracion completada: tigremorado org % -> %', v_old_org, v_target_org;
END $$;

-- Verificaciones:
-- select count(*) from public.modules
-- where location_id = (select id from public.locations where slug = 'tigremorado')
--   and org_id = '84ec5291-c221-4af2-922f-912013b59a7a';
-- select * from public.courses
-- where org_id = '84ec5291-c221-4af2-922f-912013b59a7a'
--   and lower(title) = lower('Introducción a la marca');
