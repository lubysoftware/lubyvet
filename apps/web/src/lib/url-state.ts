import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server';

/**
 * 011/T016: o estado das telas na URL (busca, página, aba, animal escolhido, resultado de
 * gravação), lido e escrito só por aqui, com nuqs. Nenhum dado pessoal vai para a URL: o termo
 * de busca é o começo de um sobrenome, e o resto são identificadores e códigos.
 */
export const RESULTS = ['ownerSaved', 'petSaved', 'appointmentSaved', 'encounterSaved'] as const;
export const ADMIN_TABS = ['indicators', 'species', 'specialties', 'vets'] as const;

const ownersSearch = {
  lastName: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(10),
};
const ownerRecord = { pet: parseAsInteger, saved: parseAsStringLiteral(RESULTS) };
const catalog = { page: parseAsInteger.withDefault(1) };
const admin = { tab: parseAsStringLiteral(ADMIN_TABS).withDefault('indicators') };
const fromAppointment = { appointment: parseAsInteger, version: parseAsInteger };

// As URLs continuam explícitas (page=1 aparece), como antes da troca.
const keep = { clearOnDefault: false };

export const loadOwnersSearch = createLoader(ownersSearch);
export const loadOwnerRecord = createLoader(ownerRecord);
export const loadCatalog = createLoader(catalog);
export const loadAdmin = createLoader(admin);
export const loadFromAppointment = createLoader(fromAppointment);

export const ownersSearchUrl = createSerializer(ownersSearch, keep);
export const ownerRecordUrl = createSerializer(ownerRecord, keep);
export const catalogUrl = createSerializer(catalog, keep);
export const adminUrl = createSerializer(admin, keep);
export const fromAppointmentUrl = createSerializer(fromAppointment, keep);

/** Leituras da API com paginação, pelo mesmo serializador (o catálogo de veterinários). */
export const vetCatalogApiUrl = createSerializer(
  { page: parseAsInteger.withDefault(1), pageSize: parseAsInteger.withDefault(10) },
  keep,
);
