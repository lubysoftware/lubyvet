import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ChangeSpeciesInput, ChangeVetInput, SpeciesInput, VetInput } from '@lubyvet/contracts';
import { IdParamPipe } from '../../../../shared/interface/http/id-param.pipe';
import { ZodValidationPipe } from '../../../../shared/interface/http/zod-validation.pipe';
import { type SpeciesRow, type VetRow, Vocabularies } from '../../application/vocabularies.use-cases';

/** 009: superfície administrativa (D18: só Administrador, aplicado pela 007). */
@Controller('admin')
export class AdminController {
  constructor(private readonly vocab: Vocabularies) {}

  @Get('species')
  listSpecies(): Promise<SpeciesRow[]> {
    return this.vocab.listSpecies();
  }
  @Post('species')
  @HttpCode(201)
  createSpecies(@Body(new ZodValidationPipe(SpeciesInput)) body: { name: string }): Promise<SpeciesRow> {
    return this.vocab.createSpecies(body.name);
  }
  @Patch('species/:speciesId')
  changeSpecies(
    @Param('speciesId', new IdParamPipe('species_not_found')) id: number,
    @Body(new ZodValidationPipe(ChangeSpeciesInput)) body: ChangeSpeciesInput,
  ): Promise<SpeciesRow> {
    return this.vocab.changeSpecies(id, body.version, { name: body.name, status: body.status });
  }
  @Get('vets')
  listVets(): Promise<VetRow[]> {
    return this.vocab.listVets();
  }
  @Post('vets')
  @HttpCode(201)
  createVet(@Body(new ZodValidationPipe(VetInput)) body: VetInput): Promise<VetRow> {
    return this.vocab.createVet(body.firstName, body.lastName, body.specialtyIds);
  }
  @Patch('vets/:vetId')
  changeVet(
    @Param('vetId', new IdParamPipe('vet_not_found')) id: number,
    @Body(new ZodValidationPipe(ChangeVetInput)) body: ChangeVetInput,
  ): Promise<VetRow> {
    const { version, ...data } = body;
    return this.vocab.changeVet(id, version, data);
  }
}
