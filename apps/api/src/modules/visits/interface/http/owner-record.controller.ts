import { Controller, Get, Param, Query } from '@nestjs/common';
import { OwnerRecordQuery, type OwnerRecordOutput } from '@lubyvet/contracts';
import { IdParamPipe } from '../../../../shared/interface/http/id-param.pipe';
import { ZodValidationPipe } from '../../../../shared/interface/http/zod-validation.pipe';
import { GetOwnerRecord } from '../../application/owner-record.use-case';
import { presentAppointment } from './visit.presenter';

@Controller('owners/:ownerId/record')
export class OwnerRecordController {
  constructor(private readonly record: GetOwnerRecord) {}

  /** 001/US-6: ficha do dono com animais e visitas. */
  @Get()
  async get(
    @Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number,
    @Query(new ZodValidationPipe(OwnerRecordQuery)) q: OwnerRecordQuery,
  ): Promise<OwnerRecordOutput> {
    const r = await this.record.execute(ownerId, q.visitsPage, q.visitsPageSize);
    return {
      ownerId,
      pets: r.pets.map((p) => ({
        id: p.id,
        name: p.name,
        birthDate: p.birthDate,
        species: p.species,
        status: p.status,
        visits: {
          items: p.appointments.map((a) => presentAppointment(a, r.now)),
          page: r.page,
          pageSize: r.pageSize,
          total: p.total,
        },
      })),
    };
  }
}
