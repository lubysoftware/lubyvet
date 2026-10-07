/** 008: leitura de saúde e de indicadores, sem dado pessoal. */
export interface OpsReader {
  databaseUp(): Promise<boolean>;
  metrics(): Promise<Record<string, number | Record<string, number>>>;
}
export const OPS_READER = Symbol('OpsReader');
