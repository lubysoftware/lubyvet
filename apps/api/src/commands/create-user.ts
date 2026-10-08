import { ROLES, type Role } from '@lubyvet/contracts';
import argon2 from 'argon2';
import { Pool } from 'pg';
import { logger } from '../shared/infra/logger';

/**
 * D18: cria ou atualiza um usuário da equipe. A senha chega pelo ambiente, nunca por argumento
 * nem por arquivo do repositório (item 8 do Não negociável):
 *   LV_LOGIN=ana@clinica LV_NAME="Ana" LV_ROLE=admin LV_PASSWORD=... node dist/commands/create-user.js
 */
async function main(): Promise<void> {
  const { LV_LOGIN: login, LV_NAME: name, LV_ROLE: role, LV_PASSWORD: password } = process.env;
  if (!login || !name || !password || !(ROLES as readonly string[]).includes(role ?? '')) {
    logger.error('informe LV_LOGIN, LV_NAME, LV_PASSWORD e LV_ROLE (reader, writer ou admin)');
    process.exitCode = 1;
    return;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const hash = await argon2.hash(password);
  await pool.query(
    `insert into users (name, login, password_hash, role, updated_at) values ($1, $2, $3, $4, now())
     on conflict (login) do update set name = $1, password_hash = $3, role = $4, status = 'active',
       failed_attempts = 0, locked_until = null, updated_at = now()`,
    // A autenticação procura o login em minúsculas (users_login_lower_check).
    [name, login.trim().toLowerCase(), hash, role as Role],
  );
  await pool.end();
  logger.info({ role }, 'usuário gravado');
}
void main();
