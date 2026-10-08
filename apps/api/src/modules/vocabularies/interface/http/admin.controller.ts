import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  type AdminSpecialtyOutput,
  ChangeSpecialtyInput,
  ChangeSpeciesInput,
  ChangeVetInput,
  SpecialtyInput,
  SpeciesInput,
  VetInput,
} from '@lubyvet/contracts';
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
  /** 009/US-2, D52: especialidades com situação, versão e quantos veterinários a têm. */
  @Get('specialties')
  listSpecialties(): Promise<AdminSpecialtyOutput[]> {
    return this.vocab.listSpecialties();
  }
  @Post('specialties')
  @HttpCode(201)
  createSpecialty(
    @Body(new ZodValidationPipe(SpecialtyInput)) body: SpecialtyInput,
  ): Promise<AdminSpecialtyOutput> {
    return this.vocab.createSpecialty(body.name);
  }
  @Patch('specialties/:specialtyId')
  changeSpecialty(
    @Param('specialtyId', new IdParamPipe('specialty_not_found')) id: number,
    @Body(new ZodValidationPipe(ChangeSpecialtyInput)) body: ChangeSpecialtyInput,
  ): Promise<AdminSpecialtyOutput> {
    return this.vocab.changeSpecialty(id, body.version, { name: body.name, status: body.status });
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
