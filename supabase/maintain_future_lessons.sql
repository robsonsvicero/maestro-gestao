-- Mantém 12 meses de aulas futuras para todos os alunos ativos.
-- Execute este arquivo uma única vez no SQL Editor do Supabase.

create extension if not exists pg_cron with schema extensions;

-- Compatibilidade com bancos criados por versões anteriores do script de setup.
alter table public.student
  add column if not exists student_status text not null default 'active';

create or replace function public.maintain_future_lessons()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  student_record record;
  target_day integer;
  scheduled_date date;
  horizon date := (current_date + interval '12 months')::date;
  created_count integer := 0;
  inserted_count integer;
begin
  for student_record in
    select student.id, student.full_name, student.instrument, student.lesson_day, student.lesson_time, student.user_id
    from public.student as student
    where student.student_status = 'active'
      and student.lesson_day is not null
      and btrim(student.lesson_day) <> ''
      and student.lesson_time is not null
      and btrim(student.lesson_time) <> ''
  loop
    target_day := case translate(lower(btrim(student_record.lesson_day)), 'áàâãéêíóôõúüç', 'aaaaeeiooouuc')
      when 'domingo' then 0
      when 'segunda' then 1
      when 'segunda-feira' then 1
      when 'terca' then 2
      when 'terca-feira' then 2
      when 'quarta' then 3
      when 'quarta-feira' then 3
      when 'quinta' then 4
      when 'quinta-feira' then 4
      when 'sexta' then 5
      when 'sexta-feira' then 5
      when 'sabado' then 6
    end;

    -- Ignora cadastros com dia inválido, sem interromper os demais alunos.
    if target_day is null then
      continue;
    end if;

    scheduled_date := current_date + ((target_day - extract(dow from current_date)::integer + 7) % 7);

    while scheduled_date <= horizon loop
      insert into public.lesson (
        user_id,
        student_id,
        student_name,
        instrument,
        date,
        start_time,
        end_time,
        duration,
        status,
        payment_status,
        notes
      )
      select
        student_record.user_id,
        student_record.id,
        student_record.full_name,
        student_record.instrument,
        scheduled_date,
        student_record.lesson_time,
        to_char((student_record.lesson_time::time + interval '60 minutes')::time, 'HH24:MI'),
        60,
        'scheduled',
        'pending',
        format('Aula agendada automaticamente para %s', student_record.full_name)
      where not exists (
        select 1
        from public.lesson existing_lesson
        where existing_lesson.student_id = student_record.id
          and existing_lesson.date = scheduled_date
      );

      get diagnostics inserted_count = row_count;
      created_count := created_count + inserted_count;
      scheduled_date := scheduled_date + 7;
    end loop;
  end loop;

  return created_count;
end;
$$;

-- Executa todo dia 1, às 06:00 UTC (03:00 em São Paulo).
select cron.unschedule(jobid)
from cron.job
where jobname = 'maintain-future-lessons';

select cron.schedule(
  'maintain-future-lessons',
  '0 6 1 * *',
  $$select public.maintain_future_lessons();$$
);

-- Execute uma vez após instalar para completar imediatamente as agendas atuais.
select public.maintain_future_lessons();
