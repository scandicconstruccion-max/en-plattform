import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Users, FileText, Send, AlertCircle, CheckCircle, Eye, Trash2 } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import InviterLeverandorDialog from './InviterLeverandorDialog';
import TilbudssammenlignPanel from './TilbudssammenlignPanel';

const statusConfig = {
  DRAFT:       { label: 'Utkast',    classes: 'bg-slate-100 text-slate-600' },
  SENT:        { label: 'Sendt',     classes: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'Pågående',  classes: 'bg-amber-100 text-amber-700' },
  CLOSED:      { label: 'Lukket',    classes: 'bg-emerald-100 text-emerald-700' },
};

const invStatusConfig = {
  INVITED:     { label: 'Invitert',   icon: Send,          classes: 'bg-blue-100 text-blue-700' },
  OPENED:      { label: 'Åpnet',      icon: Eye,           classes: 'bg-amber-100 text-amber-700' },
  RESPONDED:   { label: 'Svart',      icon: CheckCircle,   classes: 'bg-emerald-100 text-emerald-700' },
  DECLINED:    { label: 'Avslått',    icon: X,             classes: 'bg-red-100 text-red-700' },
  NO_RESPONSE: { label: 'Ingen svar', icon: AlertCircle,   classes: 'bg-red-100 text-red-700' },
};

export default function AnbudsprosjektDetaljer({ project, onClose }) {
  const [showInvite, setShowInvite] = useState(false);
  const [resending, setResending] = useState(null); // supplierId currently being resent
  const queryClient = useQueryClient();

  const handleResend = async (supplierId) => {
    setResending(supplierId);
    try {
      await base44.functions.invoke('anbudSendInvitations', {
        anbudProjectId: project.id,
        supplierIds: [supplierId],
        resend: true,
      });
    } finally {
      setResending(null);
    }
  };

  const { data: invitations = [] } = useQuery({
    queryKey: ['anbudInvitations', project.id],
    queryFn: () => base44.entities.AnbudInvitation.filter({ anbudProjectId: project.id }),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['anbudQuotes', project.id],
    queryFn: () => base44.entities.AnbudQuote.filter({ anbudProjectId: project.id }),
  });

  const sc = statusConfig[project.status] || statusConfig.DRAFT;
  const isDeadlinePast = project.responseDeadline && isPast(parseISO(project.responseDeadline));

  const needsFollowUp = invitations.filter(i => i.status === 'INVITED' || i.status === 'OPENED');

  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ['anbudInvitations', project.id] });
    queryClient.invalidateQueries({ queryKey: ['anbudProjects'] });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className="bg-white dark:bg-slate-900 w-full lg:max-w-3xl lg:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn('border-0', sc.classes)}>{sc.label}</Badge>
              {isDeadlinePast && project.status !== 'CLOSED' && (
                <Badge className="bg-red-100 text-red-700 border-0 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Frist passert
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{project.title}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              {project.tradeType && <span><strong>Fag:</strong> {project.tradeType}</span>}
              {project.responseDeadline && (
                <span className={cn(isDeadlinePast ? 'text-red-500 font-semibold' : '')}>
                  <strong>Svarfrist:</strong> {format(parseISO(project.responseDeadline), 'd. MMM yyyy', { locale: nb })}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {project.description && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Beskrivelse</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">{project.description}</p>
            </div>
          )}

          {project.fileAttachments?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Vedlegg</h3>
              <div className="space-y-2">
                {project.fileAttachments.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-100 transition-colors">
                    <FileText className="h-4 w-4 flex-shrink-0" />{f.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Tilbudssammenligning */}
          <TilbudssammenlignPanel invitations={invitations} quotes={quotes} projectId={project.id} />

          {/* Invitations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Users className="h-4 w-4" /> Leverandører ({invitations.length})
              </h3>
              <Button onClick={() => setShowInvite(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1">
                <Send className="h-3.5 w-3.5" /> Inviter
              </Button>
            </div>

            {needsFollowUp.length > 0 && (
              <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {needsFollowUp.length} leverandør{needsFollowUp.length > 1 ? 'er' : ''} har ikke svart ennå
              </div>
            )}

            {invitations.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">Ingen invitasjoner sendt ennå</div>
            ) : (
              <div className="space-y-2">
                {invitations.map(inv => {
                  const isc = invStatusConfig[inv.status] || invStatusConfig.INVITED;
                  const Icon = isc.icon;
                  const quote = quotes.find(q => q.supplierId === inv.supplierId);
                  return (
                    <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                      <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-400 flex-shrink-0 shadow-sm">
                        {inv.supplierName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{inv.supplierName}</p>
                        <p className="text-xs text-slate-500 truncate">{inv.supplierEmail}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {quote && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg">
                            {quote.price ? `${quote.price.toLocaleString('nb-NO')} ${quote.currency}` : 'Tilbud mottatt'}
                          </span>
                        )}
                        <Badge className={cn('border-0 flex items-center gap-1', isc.classes)}>
                          <Icon className="h-3 w-3" />{isc.label}
                        </Badge>
                        {inv.status !== 'RESPONDED' && (
                          <button
                            onClick={() => handleResend(inv.supplierId)}
                            disabled={resending === inv.supplierId}
                            className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {resending === inv.supplierId ? 'Sender...' : 'Send på nytt'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <InviterLeverandorDialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        project={project}
        existingInvitations={invitations}
        onDone={handleDone}
      />
    </div>
  );
}