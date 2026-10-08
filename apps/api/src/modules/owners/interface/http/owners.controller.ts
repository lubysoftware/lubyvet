import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { type Authorship, GetAuthorship } from '../../application/get-authorship.use-case';
import {
  ChangeOwnerContactInput,
  type OwnerOutput,
  type OwnerSearchOutput,
  RegisterOwnerInput,
  SearchOwnersQuery,
  type SimilarityDismissalOutput,
} from '@lubyvet/contracts';
import { ListSimilarityDismissals } from '../../application/list-similarity-dismissals.use-case';
import { SearchOwners } from '../../application/search-owners.use-case';
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
    private readonly searchOwners: SearchOwners,
    private readonly getAuthorship: GetAuthorship,
    private readonly listSimilarityDismissals: ListSimilarityDismissals,
  ) {}

  /** 012/US-3, D51: histórico da dispensa do aviso de dono parecido (Administrador, pela matriz). */
  @Get(':ownerId/similarity-dismissals')
  async similarityDismissals(
    @Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number,
  ): Promise<SimilarityDismissalOutput[]> {
    return (await this.listSimilarityDismissals.execute(ownerId)).map((d) => ({
      similarOwner: d.similarOwner,
      dismissedBy: d.dismissedBy,
      dismissedAt: d.dismissedAt.toISOString(),
    }));
  }

  /** 007/T018: autoria consultável por cadastro, para todos os papéis. */
  @Get(':ownerId/authorship')
  async authorship(
    @Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number,
  ): Promise<Authorship> {
    return this.getAuthorship.execute(ownerId);
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
