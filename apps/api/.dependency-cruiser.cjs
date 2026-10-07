// Regra de fronteira de docs/padroes/arquitetura.md: a dependência só aponta para dentro.
module.exports = {
  forbidden: [
    {
      name: 'domain-is-pure',
      comment:
        'domain/ não importa framework, banco nem outras camadas. Exceção única: as regras puras e os limites de @lubyvet/contracts, para valerem igual no formulário e no domínio (P6).',
      severity: 'error',
      from: { path: '^src/(modules/[^/]+|shared)/domain/' },
      to: {
        pathNot: [
          '^src/(modules/[^/]+|shared)/domain/',
          '^node_modules/(typescript|@types)/',
          '^(node_modules/@lubyvet/contracts|\\.\\./\\.\\./packages/contracts)/',
        ],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'application-no-infra',
      comment: 'application/ não importa infra/, interface/, NestJS, Prisma, Redis nem RabbitMQ.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/application/' },
      to: {
        path: [
          '/infra/',
          '/interface/',
          '^node_modules/(@nestjs|@prisma|ioredis|amqplib|pg)/',
          '^src/generated/',
        ],
      },
    },
    {
      name: 'interface-no-infra',
      comment: 'interface/ chama casos de uso, nunca adaptadores nem o Prisma.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/interface/' },
      to: { path: ['/infra/', '^node_modules/@prisma/', '^src/generated/'] },
    },
    {
      name: 'interface-calls-use-cases',
      comment:
        '011/T006: interface/ (controller, guard, presenter) chama caso de uso; porta de repositório ou leitor só se usa em application/ e infra/. Vale também para import só de tipo.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/interface/' },
      to: { path: '^src/modules/[^/]+/application/ports/' },
    },
    {
      name: 'modules-talk-through-ports',
      comment: 'um módulo só usa outro pela porta pública (application/ports).',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/',
        pathNot: [
          '^src/modules/$1/',
          '^src/modules/[^/]+/application/ports/',
          '^src/modules/[^/]+/[^/]+\\.module\\.ts$',
          '^src/modules/[^/]+/domain/[^/]+\\.errors\\.ts$',
        ],
      },
    },
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    exclude: { path: ['\\.spec\\.ts$', '^src/generated/'] },
  },
};
