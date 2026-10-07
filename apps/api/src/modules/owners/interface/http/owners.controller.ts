import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { type OwnerOutput, RegisterOwnerInput } from '@lubyvet/contracts';
import { IdParamPipe } from '../../../../shared/interface/http/id-param.pipe';
import { ZodValidationPipe } from '../../../../shared/interface/http/zod-validation.pipe';
import { GetOwner } from '../../application/get-owner.use-case';
import { RegisterOwner } from '../../application/register-owner.use-case';
import { presentOwner } from './owner.presenter';

@Controller('owners')
export class OwnersController {
  constructor(
    private readonly registerOwner: RegisterOwner,
    private readonly getOwner: GetOwner,
  ) {}

  /** US-1: cria o dono e devolve a ficha dele (o front navega para ela). */
  @Post()
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(RegisterOwnerInput)) body: RegisterOwnerInput,
  ): Promise<OwnerOutput> {
    return presentOwner(await this.registerOwner.execute(body));
  }

  @Get(':ownerId')
  async get(@Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number): Promise<OwnerOutput> {
    return presentOwner(await this.getOwner.execute(ownerId));
  }
}
