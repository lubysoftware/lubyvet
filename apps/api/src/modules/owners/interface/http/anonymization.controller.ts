import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { RedactFreeTextInput } from '@lubyvet/contracts';
import type { Actor } from '../../../../shared/interface/http/roles';
import { IdParamPipe } from '../../../../shared/interface/http/id-param.pipe';
import { ZodValidationPipe } from '../../../../shared/interface/http/zod-validation.pipe';
import { AnonymizeOwner, type FreeTextItem } from '../../application/anonymize-owner.use-case';

/** 007/US-3, D24, D25: anonimização do dono e revisão do texto livre (Administrador, pela matriz). */
@Controller('owners')
export class AnonymizationController {
  constructor(private readonly anonymizeOwner: AnonymizeOwner) {}

  /** Anonimiza o dono; o histórico clínico fica (P2). */
  @Post(':ownerId/anonymize')
  @HttpCode(200)
  anonymize(
    @Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number,
    @Req() req: { actor: Actor },
  ): Promise<{ pendingReview: number }> {
    return this.anonymizeOwner.execute(ownerId, req.actor.userId);
  }

  /** Trechos de texto livre a revisar, com o dado do dono destacado. */
  @Get(':ownerId/free-text')
  freeText(@Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number): Promise<FreeTextItem[]> {
    return this.anonymizeOwner.review(ownerId);
  }

  /** Conclui a revisão: os trechos confirmados viram [removido]. */
  @Post(':ownerId/free-text/redact')
  @HttpCode(204)
  async redact(
    @Param('ownerId', new IdParamPipe('owner_not_found')) ownerId: number,
    @Body(new ZodValidationPipe(RedactFreeTextInput)) body: RedactFreeTextInput,
    @Req() req: { actor: Actor },
  ): Promise<void> {
    await this.anonymizeOwner.redact(ownerId, body.spans, req.actor.userId);
  }
}
