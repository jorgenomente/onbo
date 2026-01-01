with target_module as (
  select id, org_id
  from public.modules
  order by created_at asc
  limit 1
),
target_unit as (
  select id, org_id
  from public.module_units
  where module_id = (select id from target_module)
  order by order_index asc
  limit 1
),
target_lesson as (
  select id
  from public.lessons
  where unit_id = (select id from target_unit)
  order by order_index asc
  limit 1
)
update public.lessons
set content_json = (
  '[
    {"type":"heading","level":1,"text":"Welcome to the course"},
    {"type":"paragraph","text":"This is a short intro to the unit and what you will learn."},
    {"type":"bullets","items":["Understand the basics","Learn the workflow","Apply the concepts"]},
    {"type":"divider"},
    {"type":"embed","url":"https://www.youtube.com/embed/dQw4w9WgXcQ","title":"Demo video"},
    {"type":"file","url":"https://example.com/resource.pdf","label":"Download the resource"}
  ]'
)::jsonb
where id = (select id from target_lesson);
