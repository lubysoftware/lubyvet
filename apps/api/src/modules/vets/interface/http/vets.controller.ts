import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { PageQuery, type VetCatalogOutput, type VetPatientsOutput } from '@lubyvet/contracts';
import { IdParamPipe } from '../../../../shared/interface/http/id-param.pipe';
import { ListVetPatients } from '../../application/list-vet-patients.use-case';
import { DomainError } from '../../../../shared/domain/errors';
import { ZodValidationPipe } from '../../../../shared/interface/http/zod-validation.pipe';
import { GetVetCatalog } from '../../application/vet-catalog.use-case';

/** D22/T012: um formato só (JSON) para o próprio front; pedido de outro formato é recusado. */
class UnsupportedFormat extends DomainError {
  readonly code = 'unsupported_format';
  readonly kind = 'unsupported';
}

@Controller('vets')
export class VetsController {
  constructor(
    private readonly catalog: GetVetCatalog,
    private readonly patients: ListVetPatients,
  ) {}

  @Get(':vetId/patients')
  listPatients(@Param('vetId', new IdParamPipe('vet_not_found')) vetId: number): Promise<VetPatientsOutput> {
    return this.patients.execute(vetId);
  }

  @Get()
  async list(
    @Headers('accept') accept: string | undefined,
    @Query(new ZodValidationPipe(PageQuery)) q: PageQuery,
  ): Promise<VetCatalogOutput> {
    if (accept && !/application\/json|\*\/\*/.test(accept)) throw new UnsupportedFormat('unsupported_format');
    return this.catalog.execute(q.page, q.pageSize);
  }
}
