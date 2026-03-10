/**
 * Hent effektiv verdi for et felt med arv fra parent
 */
export const getEffectiveValue = (project, parentProject, field) => {
  if (!project) return null;
  
  // Hvis prosjektet ikke skal arve eller har sin egen verdi
  if (!project.inherit_from_parent || project[field]) {
    return project[field] || null;
  }
  
  // Arv fra parent
  if (parentProject) {
    return parentProject[field] || null;
  }
  
  return null;
};

/**
 * Organisér prosjekter i et hierarki
 */
export const buildProjectHierarchy = (allProjects) => {
  if (!allProjects) return [];
  
  const map = {};
  const roots = [];
  
  // First pass: create map
  allProjects.forEach(p => {
    map[p.id] = { ...p, children: [] };
  });
  
  // Second pass: build hierarchy
  allProjects.forEach(p => {
    if (p.parent_id && map[p.parent_id]) {
      map[p.parent_id].children.push(map[p.id]);
    } else {
      roots.push(map[p.id]);
    }
  });
  
  return roots;
};

/**
 * Finn alle barn av et prosjekt (rekursivt)
 */
export const getAllChildren = (project) => {
  if (!project || !project.children) return [];
  const children = [...project.children];
  project.children.forEach(child => {
    children.push(...getAllChildren(child));
  });
  return children;
};

/**
 * Finn forelder-prosjekt
 */
export const findParentProject = (projectId, allProjects) => {
  const project = allProjects.find(p => p.id === projectId);
  if (!project || !project.parent_id) return null;
  return allProjects.find(p => p.id === project.parent_id);
};

/**
 * Finn rotprosjekt (hovedprosjekt)
 */
export const findRootProject = (projectId, allProjects) => {
  let current = allProjects.find(p => p.id === projectId);
  
  while (current && current.parent_id) {
    current = allProjects.find(p => p.id === current.parent_id);
  }
  
  return current || null;
};

/**
 * Hent søkepath (breadcrumb) for et prosjekt
 */
export const getProjectBreadcrumb = (projectId, allProjects) => {
  const path = [];
  let current = allProjects.find(p => p.id === projectId);
  
  while (current) {
    path.unshift(current);
    if (current.parent_id) {
      current = allProjects.find(p => p.id === current.parent_id);
    } else {
      break;
    }
  }
  
  return path;
};