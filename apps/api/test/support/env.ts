// Fuso de negócio fixo nos testes (docs/padroes/testes.md).
process.env.TZ = 'America/Sao_Paulo';

// O log de escrita (008/CA-5.2) vai para a saída padrão; nos testes, só aviso e erro.
process.env.LOG_LEVEL ??= 'warn';
