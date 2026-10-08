/**
 * docs/padroes/banco.md: as redundâncias de propósito e a consulta que as vigia. Cada linha diz
 * a entidade, o id e o problema.
 */
export const CONSISTENCY = `
  select 'appointment' as entity, a.id, 'situação diverge do histórico' as problem from appointments a
   where a.status <> (select c.to_status from appointment_status_changes c where c.appointment_id = a.id order by c.changed_at desc, c.id desc limit 1)
  union all
  select 'appointment', a.id, 'Realizada sem atendimento' from appointments a
   where a.status = 'done' and not exists (select 1 from encounters e where e.appointment_id = a.id)
  union all
  select 'appointment', a.id, 'atendido sem Realizada' from appointments a
   where a.status <> 'done' and exists (select 1 from encounters e where e.appointment_id = a.id)
  union all
  -- 012/CA-3.4, D51: a data da última dispensa no dono é a da linha mais recente do histórico.
  -- A anonimização (D24) limpa a coluna e mantém o histórico, que só tem identificadores (P2).
  select 'owner', o.id, 'última dispensa diverge do histórico' from owners o
   where o.similarity_dismissed_at is distinct from (select max(d.dismissed_at) from owner_similarity_dismissals d where d.owner_id = o.id)
     and not exists (select 1 from owner_anonymizations an where an.owner_id = o.id)`;
