/** docs/padroes/banco.md: as duas redundâncias de propósito e a consulta que as vigia. */
export const CONSISTENCY = `
  select a.id as appointment_id, 'situação diverge do histórico' as problem from appointments a
   where a.status <> (select c.to_status from appointment_status_changes c where c.appointment_id = a.id order by c.changed_at desc, c.id desc limit 1)
  union all
  select a.id, 'Realizada sem atendimento' from appointments a
   where a.status = 'done' and not exists (select 1 from encounters e where e.appointment_id = a.id)
  union all
  select a.id, 'atendido sem Realizada' from appointments a
   where a.status <> 'done' and exists (select 1 from encounters e where e.appointment_id = a.id)`;
