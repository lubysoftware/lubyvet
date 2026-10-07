import { FieldRuleViolation, NotFound } from '../../../shared/domain/errors';

export class AppointmentNotFound extends NotFound {
  constructor() {
    super('appointment_not_found');
  }
}

/** D09/CA-4.6: animal Falecido ou Transferido não aceita agendamento novo. */
export class PetNotSchedulable extends FieldRuleViolation {
  constructor() {
    super([{ path: 'petId', code: 'pet_not_schedulable' }]);
  }
}
