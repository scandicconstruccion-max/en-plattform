import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AnbudsKPI from './AnbudsKPI';
import AnbudsProsjektListe from './AnbudsProsjektListe';
import AnbudsProsjektDetaljer from './AnbudsProsjektDetaljer';
import KritiskDashboard from './KritiskDashboard';

export default function AnbudsmodulOversikt({ onNavigate }) {
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['anbudProjects'],
    queryFn: () => base44.entities.AnbudProject.list('-created_date'),
  });
  const { data: invitations = [] } = useQuery({
    queryKey: ['anbudInvitations'],
    queryFn: () => base44.entities.AnbudInvitation.list(),
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ['anbudQuotes'],
    queryFn: () => base44.entities.AnbudQuote.list(),
  });

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
  };

  const handleCreateRequest = () => {
    onNavigate('foresporsler');
  };

  return (
    <div className="space-y-6">
      <AnbudsKPI
        projects={projects}
        invitations={invitations}
        quotes={quotes}
        onSelectProject={handleSelectProject}
      />

      {selectedProjectId ? (
        <AnbudsProsjektDetaljer
          projectId={selectedProjectId}
          onBack={() => setSelectedProjectId(null)}
          onCreateRequest={handleCreateRequest}
        />
      ) : (
        <AnbudsProsjektListe
          onSelectProject={handleSelectProject}
          onCreateRequest={handleCreateRequest}
        />
      )}
    </div>
  );
}