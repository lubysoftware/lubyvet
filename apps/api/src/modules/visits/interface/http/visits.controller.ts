import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common';
import {
  type AppointmentOutput,
  type EncounterOutput,
  type PetVisitsOutput,
  RecordEncounterInput,
  RescheduleAppointmentInput,
  ScheduleAppointmentInput,
  VersionInput,
} from '@lubyvet/contracts';
import { CLOCK, type Clock } from '../../../../shared/domain/clock';
import { StaleVersion } from '../../../../shared/domain/errors';
import { IdParamPipe } from '../../../../shared/interface/http/id-param.pipe';
import { ZodValidationPipe } from '../../../../shared/interface/http/zod-validation.pipe';
import { Visits } from '../../application/visits.use-cases';
import { Appointment, type AppointmentProps } from '../../domain/appointment';
import { presentAppointment, presentEncounter } from './visit.presenter';

const owner = new IdParamPipe('pet_not_found');
const pet = new IdParamPipe('pet_not_found');
const appt = new IdParamPipe('appointment_not_found');

/** 004: agenda e atendimento, sempre aninhados pelo dono e pelo animal (P1). */
@Controller('owners/:ownerId/pets/:petId')
export class VisitsController {
  constructor(
    private readonly visits: Visits,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private async present(run: () => Promise<Appointment>): Promise<AppointmentOutput> {
    try {
      return presentAppointment(await run(), this.clock.now());
    } catch (e) {
      if (e instanceof StaleVersion)
        throw new StaleVersion(
          presentAppointment(Appointment.restore(e.current as AppointmentProps), this.clock.now()),
        );
      throw e;
    }
  }

  @Get('visits')
  async list(
    @Param('ownerId', owner) ownerId: number,
    @Param('petId', pet) petId: number,
  ): Promise<PetVisitsOutput> {
    const r = await this.visits.listOfPet({ ownerId, petId });
    return {
      appointments: r.appointments.map((a) => presentAppointment(a, r.now)),
      encounters: r.encounters.map(presentEncounter),
    };
  }

  @Post('appointments')
  @HttpCode(201)
  schedule(
    @Param('ownerId', owner) ownerId: number,
    @Param('petId', pet) petId: number,
    @Body(new ZodValidationPipe(ScheduleAppointmentInput)) body: ScheduleAppointmentInput,
  ): Promise<AppointmentOutput> {
    return this.present(() =>
      this.visits.schedule(
        { ownerId, petId },
        { scheduledAt: new Date(body.scheduledAt), description: body.description },
      ),
    );
  }

  @Patch('appointments/:appointmentId')
  reschedule(
    @Param('ownerId', owner) ownerId: number,
    @Param('petId', pet) petId: number,
    @Param('appointmentId', appt) id: number,
    @Body(new ZodValidationPipe(RescheduleAppointmentInput)) body: RescheduleAppointmentInput,
  ): Promise<AppointmentOutput> {
    const input = {
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      description: body.description,
    };
    return this.present(() => this.visits.reschedule({ ownerId, petId }, id, input, body.version));
  }

  @Post('appointments/:appointmentId/cancel')
  @HttpCode(200)
  cancel(
    @Param('ownerId', owner) ownerId: number,
    @Param('petId', pet) petId: number,
    @Param('appointmentId', appt) id: number,
    @Body(new ZodValidationPipe(VersionInput)) body: VersionInput,
  ): Promise<AppointmentOutput> {
    return this.present(() => this.visits.cancel({ ownerId, petId }, id, body.version));
  }

  @Post('appointments/:appointmentId/no-show')
  @HttpCode(200)
  noShow(
    @Param('ownerId', owner) ownerId: number,
    @Param('petId', pet) petId: number,
    @Param('appointmentId', appt) id: number,
    @Body(new ZodValidationPipe(VersionInput)) body: VersionInput,
  ): Promise<AppointmentOutput> {
    return this.present(() => this.visits.markNoShow({ ownerId, petId }, id, body.version));
  }

  @Post('encounters')
  @HttpCode(201)
  async record(
    @Param('ownerId', owner) ownerId: number,
    @Param('petId', pet) petId: number,
    @Body(new ZodValidationPipe(RecordEncounterInput)) body: RecordEncounterInput,
  ): Promise<EncounterOutput> {
    return presentEncounter(await this.visits.recordEncounter({ ownerId, petId }, body));
  }
}
