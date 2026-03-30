export const ROLES = {
  ADMIN: 'admin',
  PROSJEKTLEDER: 'prosjektleder',
  ANSATT: 'ansatt',
  REGNSKAPSFORER: 'regnskapsforer',
  USER: 'user',
}

export const MODULES = {
  DASHBOARD: 'dashboard',
  PROSJEKTER: 'prosjekter',
  AVVIK: 'avvik',
  BEFARING: 'befaring',
  PROSJEKTFILER: 'prosjektfiler',
  ENDRINGSMELDINGER: 'endringsmeldinger',
  TIMELISTER: 'timelister',
  BILDEDOK: 'bildedok',
  SJEKKLISTER: 'sjekklister',
  TILBUD: 'tilbud',
  ORDRE: 'ordre',
  FAKTURA: 'faktura',
  FDV: 'fdv',
  BESTILLINGER: 'bestillinger',
  CHAT: 'chat',
  RESSURSPLAN: 'ressursplan',
  CRM: 'crm',
  KALENDER: 'kalender',
  ANSATTE: 'ansatte',
  MINBEDRIFT: 'minbedrift',
  BRUKERADMIN: 'brukeradmin',
  HMS: 'hms',
  SJA: 'sja',
  RUH: 'ruh',
  RISIKOANALYSE: 'risikoanalyse',
  HMSHANDBOK: 'hmshandbok',
  MOTTAKSKONTROLL: 'mottakskontroll',
  ANBUDSMODUL: 'anbudsmodul',
  VARSLER: 'varsler',
  MASKINER: 'maskiner',
  KOMPETANSER: 'kompetanser',
  LONNSGRUNNLAG: 'lonnsgrunnlag',
}

const roleModuleAccess = {
  [ROLES.ADMIN]: Object.values(MODULES),
  [ROLES.PROSJEKTLEDER]: [
    MODULES.DASHBOARD, MODULES.PROSJEKTER, MODULES.AVVIK, MODULES.BEFARING,
    MODULES.PROSJEKTFILER, MODULES.ENDRINGSMELDINGER, MODULES.TIMELISTER,
    MODULES.BILDEDOK, MODULES.SJEKKLISTER, MODULES.TILBUD, MODULES.ORDRE,
    MODULES.FAKTURA, MODULES.FDV, MODULES.BESTILLINGER, MODULES.CHAT,
    MODULES.RESSURSPLAN, MODULES.MASKINER, MODULES.KALENDER, MODULES.ANSATTE,
    MODULES.HMS, MODULES.SJA, MODULES.RUH, MODULES.RISIKOANALYSE,
    MODULES.HMSHANDBOK, MODULES.MOTTAKSKONTROLL, MODULES.ANBUDSMODUL,
    MODULES.VARSLER, MODULES.CRM,
  ],
  [ROLES.ANSATT]: [
    MODULES.DASHBOARD, MODULES.PROSJEKTER, MODULES.AVVIK, MODULES.BEFARING,
    MODULES.PROSJEKTFILER, MODULES.ENDRINGSMELDINGER, MODULES.TIMELISTER,
    MODULES.BILDEDOK, MODULES.SJEKKLISTER, MODULES.RESSURSPLAN,
    MODULES.HMS, MODULES.CHAT, MODULES.KALENDER, MODULES.SJA,
    MODULES.RUH, MODULES.RISIKOANALYSE, MODULES.HMSHANDBOK,
    MODULES.MOTTAKSKONTROLL, MODULES.VARSLER,
  ],
  [ROLES.REGNSKAPSFORER]: [
    MODULES.DASHBOARD, MODULES.ANSATTE, MODULES.TIMELISTER,
    MODULES.FAKTURA, MODULES.MASKINER, MODULES.VARSLER,
  ],
  [ROLES.USER]: Object.values(MODULES),
}

export function hasModuleAccess(profile, moduleKey) {
  if (!profile || !profile.role) return false
  const customAccess = profile.custom_module_access
  if (customAccess && customAccess.length > 0) return customAccess.includes(moduleKey)
  const allowed = roleModuleAccess[profile.role] || []
  return allowed.includes(moduleKey)
}

export function getAvailableModules(profile) {
  if (!profile || !profile.role) return []
  return roleModuleAccess[profile.role] || []
}

export function canViewKPI(profile) {
  if (!profile) return false
  return profile.role === ROLES.ADMIN || profile.role === ROLES.USER
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.PROSJEKTLEDER]: 'Prosjektleder',
  [ROLES.ANSATT]: 'Ansatt',
  [ROLES.REGNSKAPSFORER]: 'Regnskapsfører',
  [ROLES.USER]: 'Bruker',
}
