// Tilgangsstyring og roller

export const ROLES = {
  ADMIN: 'admin',
  PROSJEKTLEDER: 'prosjektleder',
  ANSATT: 'ansatt',
  REGNSKAPSFORER: 'regnskapsforer',
  USER: 'user' // Legacy fallback
};

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
  ANBUDSPORTAL: 'anbudsportal'
};

// Definerer hvilke moduler hver rolle har tilgang til
const roleModuleAccess = {
  [ROLES.ADMIN]: Object.values(MODULES),
  [ROLES.PROSJEKTLEDER]: [
    MODULES.DASHBOARD,
    MODULES.PROSJEKTER,
    MODULES.AVVIK,
    MODULES.BEFARING,
    MODULES.PROSJEKTFILER,
    MODULES.ENDRINGSMELDINGER,
    MODULES.TIMELISTER,
    MODULES.BILDEDOK,
    MODULES.SJEKKLISTER,
    MODULES.TILBUD,
    MODULES.ORDRE,
    MODULES.FAKTURA,
    MODULES.FDV,
    MODULES.BESTILLINGER,
    MODULES.CHAT,
    MODULES.RESSURSPLAN,
    MODULES.KALENDER,
    MODULES.ANSATTE,
    MODULES.HMS,
    MODULES.SJA,
    MODULES.RUH,
    MODULES.RISIKOANALYSE,
    MODULES.HMSHANDBOK,
    MODULES.MOTTAKSKONTROLL,
    MODULES.ANBUDSPORTAL
  ],
  [ROLES.ANSATT]: [
    MODULES.DASHBOARD,
    MODULES.PROSJEKTER,
    MODULES.BEFARING,
    MODULES.PROSJEKTFILER,
    MODULES.TIMELISTER,
    MODULES.BILDEDOK,
    MODULES.SJEKKLISTER,
    MODULES.CHAT,
    MODULES.KALENDER,
    MODULES.SJA,
    MODULES.RUH,
    MODULES.RISIKOANALYSE,
    MODULES.MOTTAKSKONTROLL
  ],
  [ROLES.REGNSKAPSFORER]: [
    MODULES.DASHBOARD,
    MODULES.FAKTURA,
    MODULES.ORDRE
  ],
  [ROLES.USER]: Object.values(MODULES) // Legacy fallback
};

// Sjekker om bruker har tilgang til en modul
export function hasModuleAccess(user, moduleKey) {
  if (!user || !user.role) return false;
  
  // Sjekk tilpasset modultilgang først
  if (user.custom_module_access && user.custom_module_access.length > 0) {
    return user.custom_module_access.includes(moduleKey);
  }
  
  const userRole = user.role || ROLES.USER;
  const allowedModules = roleModuleAccess[userRole] || [];
  return allowedModules.includes(moduleKey);
}

// Sjekker om bruker har tilgang til et prosjekt
export function hasProjectAccess(user, projectId) {
  if (!user) return false;
  
  // Admin har tilgang til alt
  if (user.role === ROLES.ADMIN || user.role === ROLES.USER) return true;
  
  // Prosjektleder har tilgang til prosjekter de leder
  if (user.role === ROLES.PROSJEKTLEDER) {
    return user.managed_projects?.includes(projectId) || 
           user.assigned_projects?.includes(projectId);
  }
  
  // Ansatt har tilgang til tildelte prosjekter
  if (user.role === ROLES.ANSATT) {
    return user.assigned_projects?.includes(projectId);
  }
  
  // Regnskapsfører har ikke prosjekttilgang
  return false;
}

// Filtrerer prosjekter basert på brukers tilgang
export function filterProjectsByAccess(user, projects) {
  if (!user || !projects) return [];
  
  // Admin og legacy user ser alt
  if (user.role === ROLES.ADMIN || user.role === ROLES.USER) return projects;
  
  // Regnskapsfører ser ingen prosjekter
  if (user.role === ROLES.REGNSKAPSFORER) return [];
  
  // Filtrer basert på prosjekttilknytning
  return projects.filter(project => {
    if (user.role === ROLES.PROSJEKTLEDER) {
      return user.managed_projects?.includes(project.id) || 
             user.assigned_projects?.includes(project.id);
    }
    if (user.role === ROLES.ANSATT) {
      return user.assigned_projects?.includes(project.id);
    }
    return false;
  });
}

// Sjekker om bruker kan se KPI
export function canViewKPI(user, scope = 'company') {
  if (!user) return false;
  
  // Admin ser alt
  if (user.role === ROLES.ADMIN || user.role === ROLES.USER) return true;
  
  // Prosjektleder ser kun prosjekt-KPI
  if (user.role === ROLES.PROSJEKTLEDER && scope === 'project') return true;
  
  return false;
}

// Sjekker om bruker kan redigere en ressurs
export function canEdit(user, resource) {
  if (!user) return false;
  
  // Admin kan redigere alt
  if (user.role === ROLES.ADMIN || user.role === ROLES.USER) return true;
  
  // Sjekk om bruker opprettet ressursen
  if (resource?.created_by === user.email) return true;
  
  // Prosjektleder kan redigere i sine prosjekter
  if (user.role === ROLES.PROSJEKTLEDER && resource?.project_id) {
    return hasProjectAccess(user, resource.project_id);
  }
  
  return false;
}

// Sjekker om bruker kan slette en ressurs
export function canDelete(user, resource) {
  if (!user) return false;
  
  // Admin kan slette alt
  if (user.role === ROLES.ADMIN || user.role === ROLES.USER) return true;
  
  // Prosjektleder kan slette i sine prosjekter
  if (user.role === ROLES.PROSJEKTLEDER && resource?.project_id) {
    return hasProjectAccess(user, resource.project_id);
  }
  
  return false;
}

// Sjekker filtilgang basert på access_level
export function canViewFile(user, file) {
  if (!user || !file) return false;
  
  // Admin ser alt
  if (user.role === ROLES.ADMIN || user.role === ROLES.USER) return true;
  
  // Sjekk access_level
  if (file.access_level === 'alle') return hasProjectAccess(user, file.project_id);
  if (file.access_level === 'prosjektleder') {
    return user.role === ROLES.PROSJEKTLEDER && hasProjectAccess(user, file.project_id);
  }
  if (file.access_level === 'admin') return false;
  
  return false;
}

// Henter tilgjengelige moduler for bruker
export function getAvailableModules(user) {
  if (!user || !user.role) return [];
  const userRole = user.role || ROLES.USER;
  return roleModuleAccess[userRole] || [];
}

// Rolleetiketter
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.PROSJEKTLEDER]: 'Prosjektleder',
  [ROLES.ANSATT]: 'Ansatt',
  [ROLES.REGNSKAPSFORER]: 'Regnskapsfører',
  [ROLES.USER]: 'Bruker'
};