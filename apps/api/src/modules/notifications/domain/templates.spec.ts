import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderMessage, TEMPLATE_NAMES, templateVariables } from './templates';

const facts = {
  ownerFirstName: 'Mariana',
  petName: 'Thor',
  scheduledAt: new Date('2026-10-10T12:30:00Z'),
  clinicName: 'Clínica Bichos & Cia',
  clinicPhone: '(11) 3456-7890',
};

describe('templates de WhatsApp (D28)', () => {
  it('confirmação: {{1}} dono, {{2}} animal, {{3}} data, {{4}} hora, {{5}} clínica, {{6}} telefone', () => {
    expect(templateVariables('confirmation', facts)).toEqual([
      'Mariana',
      'Thor',
      '10/10',
      '09:30',
      'Clínica Bichos & Cia',
      '(11) 3456-7890',
    ]);
    expect(renderMessage('confirmation', facts)).toBe(
      'Olá, Mariana! A consulta de Thor está agendada para 10/10 às 09:30 na Clínica Bichos & Cia. Para remarcar, fale com a clínica pelo (11) 3456-7890.',
    );
  });

  it('lembrete: {{2}} data, {{3}} hora e {{4}} animal, em ordem diferente', () => {
    expect(templateVariables('reminder', facts)).toEqual([
      'Mariana',
      '10/10',
      '09:30',
      'Thor',
      'Clínica Bichos & Cia',
      '(11) 3456-7890',
    ]);
    expect(renderMessage('reminder', facts)).toContain('amanhã, 10/10, às 09:30, Thor tem consulta');
    expect(TEMPLATE_NAMES).toEqual({ confirmation: 'lubyvet_confirmacao', reminder: 'lubyvet_lembrete' });
  });
});

describe('horário do lembrete (D29)', () => {
  it('o CronJob do chart roda às 10:00 de America/Sao_Paulo', () => {
    const values = readFileSync(join(__dirname, '../../../../../../deploy/helm/lubyvet/values.yaml'), 'utf8');
    expect(values).toMatch(/schedule: ["']0 10 \* \* \*["']/);
    expect(values).toMatch(/timeZone: America\/Sao_Paulo/);
  });
});
