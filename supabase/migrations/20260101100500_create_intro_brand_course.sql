DO $$
DECLARE
  v_location_id uuid;
  v_module_id uuid;
  v_org_id uuid;
  v_course_id uuid;
BEGIN
  -- 1) location id
  SELECT id INTO v_location_id
  FROM public.locations
  WHERE slug = 'tigremorado'
  LIMIT 1;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró location slug=tigremorado';
  END IF;

  -- 2) module id (sin org_id, porque org puede variar)
  SELECT id INTO v_module_id
  FROM public.modules
  WHERE location_id = v_location_id
    AND trim(title) = 'Introducción a la marca'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró module "Introducción a la marca" en tigremorado (location_id=%)', v_location_id;
  END IF;

  -- 3) org_id real del módulo
  SELECT org_id INTO v_org_id
  FROM public.modules
  WHERE id = v_module_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo resolver org_id del module %', v_module_id;
  END IF;

  -- 4) course id (crear si no existe) para ese org_id real
  SELECT id INTO v_course_id
  FROM public.courses
  WHERE org_id = v_org_id
    AND lower(title) = lower('Introducción a la marca')
  LIMIT 1;

  IF v_course_id IS NULL THEN
    INSERT INTO public.courses (org_id, title, description, interval_days_default, status)
    VALUES (v_org_id, 'Introducción a la marca', 'Template org-level', 7, 'active')
    RETURNING id INTO v_course_id;
  END IF;

  -- 5) join course_modules
  IF NOT EXISTS (
    SELECT 1 FROM public.course_modules cm
    WHERE cm.org_id = v_org_id
      AND cm.course_id = v_course_id
      AND cm.module_id = v_module_id
  ) THEN
    INSERT INTO public.course_modules (org_id, course_id, module_id, order_index)
    VALUES (v_org_id, v_course_id, v_module_id, 1);
  END IF;
END $$;

-- Verificacion:
-- select id, org_id, title from public.courses where lower(title) = lower('Introducción a la marca');
-- select * from public.course_modules where course_id = '<id_del_course>';
