import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ChangeOwnerContactInput, type OwnerOutput, RegisterOwnerInput } from '@lubyvet/contracts';
import { IdParamPipe } from '../../../../shared/interface/http/id-param.pipe';
import { ZodValidationPipe } from '../../../../shared/interface/http/zod-validation.pipe';
import { StaleVersion } from '../../../../shared/domain/errors';
import { ChangeOwnerContact } from '../../application/change-owner-contact.use-case';
import { Owner, type OwnerProps } from '../../domain/owner';
import { GetOwner } from '../../application/get-owner.use-case';
import { RegisterOwner } from '../../application/register-owner.use-case';
import { presentOwner } from './owner.presenter';

@Controller('owners')
export class OwnersController {
  constructor(
    private readonly registerOwner: RegisterOwner,
    private readonly getOwner: GetOwner,
    private readonly changeOwnerContact: ChangeOwnerContact,
  ) {}

  /** US-1: cria o dono e devolve a ficha dele (o front navega para ela). */
  @Post()
  @HttpCode(201)
  async register(
    @Body(new ZodValidationPipe(RegisterOwnerInput)) body: RegisterOwnerInput,
  ): Promise<OwnerOutput> {
    const { confirmSimilar, ...fields } = body;
    return presentOwner(await this.registerOwner.execute(fields, confirmSimilar));
  }

  @Get(':ownerId')
  async get(@Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number): Promise<OwnerOutput> {
    return presentOwner(await this.getOwner.execute(ownerId));
  }

  /** US-4: grava a alteração parcial e devolve a ficha (REG-47); versão vencida vira 409 (US-5). */
  @Patch(':ownerId')
  async change(
    @Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number,
    @Body(new ZodValidationPipe(ChangeOwnerContactInput)) body: ChangeOwnerContactInput,
  ): Promise<OwnerOutput> {
    const { id, version, confirmSimilar: _confirm, ...patch } = body;
    try {
      return presentOwner(await this.changeOwnerContact.execute({ ownerId, bodyId: id, version, patch }));
    } catch (e) {
      // CA-5.2: os valores atuais vão junto, no formato do contrato (P9), para o usuário decidir se regrava.
      if (e instanceof StaleVersion)
        throw new StaleVersion(presentOwner(Owner.restore(e.current as OwnerProps)));
      throw e;
    }
  }
}
