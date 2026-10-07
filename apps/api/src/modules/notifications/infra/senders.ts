import { Injectable } from '@nestjs/common';
import { logger } from '../../../shared/infra/logger';
import type { OwnerNotifier } from '../application/ports/notification.port';
import { type MessageFacts, type MessageKind, TEMPLATE_NAMES, templateVariables } from '../domain/templates';

/** D28: padrão enquanto a conta da Meta não existe. Registra o envio sem o conteúdo pessoal (P-16). */
@Injectable()
export class FakeOwnerNotifier implements OwnerNotifier {
  readonly sent: { to: string; kind: MessageKind; facts: MessageFacts }[] = [];
  async send(to: string, kind: MessageKind, facts: MessageFacts): Promise<void> {
    this.sent.push({ to, kind, facts });
    logger.info({ kind, template: TEMPLATE_NAMES[kind] }, 'mensagem ao dono (adaptador falso)');
  }
}

/** 004/T025, D28: Meta Cloud API, ligada por configuração (NOTIFIER=meta) e credenciais de Secret. */
@Injectable()
export class MetaWhatsAppNotifier implements OwnerNotifier {
  constructor(
    private readonly token = process.env.META_TOKEN ?? '',
    private readonly phoneNumberId = process.env.META_PHONE_NUMBER_ID ?? '',
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  /** Corpo do pedido à Cloud API: template, idioma pt_BR e as variáveis na ordem de D28. */
  static body(to: string, kind: MessageKind, facts: MessageFacts): Record<string, unknown> {
    return {
      messaging_product: 'whatsapp',
      to: to.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: TEMPLATE_NAMES[kind],
        language: { code: 'pt_BR' },
        components: [
          {
            type: 'body',
            parameters: templateVariables(kind, facts).map((text) => ({ type: 'text', text })),
          },
        ],
      },
    };
  }

  async send(to: string, kind: MessageKind, facts: MessageFacts): Promise<void> {
    const res = await this.fetchFn(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(MetaWhatsAppNotifier.body(to, kind, facts)),
    });
    if (!res.ok) throw new Error(`meta_send_failed_${res.status}`);
  }
}
