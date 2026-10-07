import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import {
  type Authorship,
  OWNER_AUTHORSHIP,
  type OwnerAuthorshipReader,
} from '../../application/ports/owner-repository.port';
import { OwnerNotFound } from '../../domain/owner.errors';
import { z } from 'zod';
import type { Actor } from '../../../../shared/interface/http/roles';
import { AnonymizeOwner, type FreeTextItem } from '../../application/anonymize-owner.use-case';
import {
  ChangeOwnerContactInput,
  type OwnerOutput,
  type OwnerSearchOutput,
  RegisterOwnerInput,
  SearchOwnersQuery,
} from '@lubyvet/contracts';
import { SearchOwners } from '../../application/search-owners.use-case';
import { IdParamPipe } from '../../../../shared/interface/http/id-param.pipe';
import { ZodValidationPipe } from '../../../../shared/interface/http/zod-validation.pipe';
import { StaleVersion } from '../../../../shared/domain/errors';
import { ChangeOwnerContact } from '../../application/change-owner-contact.use-case';
import { Owner, type OwnerProps } from '../../domain/owner';
import { GetOwner } from '../../application/get-owner.use-case';
import { RegisterOwner } from '../../application/register-owner.use-case';
import { presentOwner } from './owner.presenter';

const RedactInput = z.object({
  spans: z.array(
    z.object({
      entity: z.enum(['appointment', 'encounter']),
      id: z.number().int(),
      field: z.string(),
      start: z.number().int(),
      end: z.number().int(),
    }),
  ),
});

@Controller('owners')
export class OwnersController {
  constructor(
    private readonly registerOwner: RegisterOwner,
    private readonly getOwner: GetOwner,
    private readonly changeOwnerContact: ChangeOwnerContact,
    private readonly searchOwners: SearchOwners,
    private readonly anonymizeOwner: AnonymizeOwner,
    @Inject(OWNER_AUTHORSHIP) private readonly authorshipReader: OwnerAuthorshipReader,
  ) {}

  /** 007/T018: autoria consultável por cadastro, para todos os papéis. */
  @Get(':ownerId/authorship')
  async authorship(
    @Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number,
  ): Promise<Authorship> {
    const a = await this.authorshipReader.authorship(ownerId);
    if (!a) throw new OwnerNotFound();
    return a;
  }

  /** 007/US-3, D24: anonimiza o dono (Administrador); o histórico clínico fica. */
  @Post(':ownerId/anonymize')
  @HttpCode(200)
  anonymize(
    @Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number,
    @Req() req: { actor: Actor },
  ): Promise<{ pendingReview: number }> {
    return this.anonymizeOwner.execute(ownerId, req.actor.userId);
  }

  /** 007/T019, D25: trechos de texto livre a revisar, com o dado do dono destacado. */
  @Get(':ownerId/free-text')
  freeText(@Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number): Promise<FreeTextItem[]> {
    return this.anonymizeOwner.review(ownerId);
  }

  @Post(':ownerId/free-text/redact')
  @HttpCode(204)
  async redact(
    @Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number,
    @Body(new ZodValidationPipe(RedactInput)) body: z.infer<typeof RedactInput>,
    @Req() req: { actor: Actor },
  ): Promise<void> {
    await this.anonymizeOwner.redact(ownerId, body.spans, req.actor.userId);
  }

  /** 002: busca pelo começo do sobrenome, paginada; o termo normalizado volta para os links. */
  @Get()
  async search(
    @Query(new ZodValidationPipe(SearchOwnersQuery)) query: SearchOwnersQuery,
  ): Promise<OwnerSearchOutput> {
    return this.searchOwners.execute(query);
  }

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
    const { id, version, confirmSimilar, ...patch } = body;
    try {
      return presentOwner(
        await this.changeOwnerContact.execute({ ownerId, bodyId: id, version, patch, confirmSimilar }),
      );
    } catch (e) {
      // CA-5.2: os valores atuais vão junto, no formato do contrato (P9), para o usuário decidir se regrava.
      if (e instanceof StaleVersion)
        throw new StaleVersion(presentOwner(Owner.restore(e.current as OwnerProps)));
      throw e;
    }
  }
}
