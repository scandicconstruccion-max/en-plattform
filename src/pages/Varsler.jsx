import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2, AlertCircle, AlertTriangle, Info, Search, Filter, Mail, Settings, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const typeConfig = {
  info: { icon: Info, label: 'Info', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', badgeCls: 'bg-emerald-100 text-emerald-700', border: 'border-l-emerald-500' },
  warning: { icon: AlertTriangle, label: 'Advarsel', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', badgeCls: 'bg-amber-100 text-amber-700', border: 'border-l-amber-500' },
  critical: { icon: AlertCircle, label: 'Kritisk', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', badgeCls: 'bg-red-100 text-red-700', border: 'border-l-red-500' },
};

const moduleColors = {
  Anbud: 'bg-purple-100 text-purple-700',
  CRM: 'bg-blue-100 text-blue-700',
  Avvik: 'bg-red-100 text-red-700',
  Sjekklister: 'bg-teal-100 text-teal-700',
  Ressursplan: 'bg-indigo-100 text-indigo-700',
  Faktura: 'bg-orange-100 text-orange-700',
  Ordre: 'bg-cyan-100 text-cyan-700',
  System: 'bg-slate-100 text-slate-700',
};

const MODULES = ['Alle moduler', 'Anbud', 'CRM', 'Avvik', 'Sjekklister', 'Ressursplan', 'Faktura', 'Ordre', 'System'];
const TYPES = ['Alle typer', 'info', 'warning', 'critical'];
const STATUSES = ['Alle', 'unread', 'read'];

export default function Varsler() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('Alle moduler');
  const [typeFilter, setTypeFilter] = useState('Alle typer');
  const [statusFilter, setStatusFilter] = useState('Alle');
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    onSuccess: (user) => {
      setEmailEnabled(user?.email_notifications_enabled || false);
      setNotificationEmail(user?.notification_email || user?.email || '');
    }
  });

  // Set initial values when user loads
  useState(() => {
    if (currentUser) {
      setEmailEnabled(currentUser.email_notifications_enabled || false);
      setNotificationEmail(currentUser.notification_email || currentUser.email || '');
    }
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 200),
    refetchInterval: 30000,
  });

  const saveEmailSettingsMutation = useMutation({
    mutationFn: () => base44.auth.updateMe({
      email_notifications_enabled: emailEnabled,
      notification_email: notificationEmail,
    }),
    onSuccess: () => {
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2500);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { status: 'read' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => n.status === 'unread');
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { status: 'read' })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const read = notifications.filter(n => n.status === 'read');
      await Promise.all(read.map(n => base44.entities.Notification.delete(n.id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const filtered = notifications.filter(n => {
    if (moduleFilter !== 'Alle moduler' && n.module !== moduleFilter) return false;
    if (typeFilter !== 'Alle typer' && n.type !== typeFilter) return false;
    if (statusFilter !== 'Alle' && n.status !== statusFilter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const handleClick = (n) => {
    if (n.status === 'unread') markReadMutation.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
            <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Varsler</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {unreadCount > 0 ? `${unreadCount} uleste varsler` : 'Ingen uleste varsler'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} className="gap-2 text-sm">
              <CheckCheck className="h-4 w-4" />
              Merk alle lest
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => deleteAllReadMutation.mutate()} className="gap-2 text-sm text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
            Slett leste
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            placeholder="Søk i varsler..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            {MODULES.map(m => (
              <button
                key={m}
                onClick={() => setModuleFilter(m)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                  moduleFilter === m
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                typeFilter === t
                  ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              )}
            >
              {t === 'Alle typer' ? 'Alle typer' : typeConfig[t]?.label || t}
            </button>
          ))}
          <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              )}
            >
              {s === 'unread' ? 'Ulest' : s === 'read' ? 'Lest' : 'Alle'}
            </button>
          ))}
        </div>
      </div>

      {/* Notification list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Laster varsler...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Ingen varsler funnet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Prøv å endre filtrene</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((n) => {
              const cfg = typeConfig[n.type] || typeConfig.info;
              const Icon = cfg.icon;
              const isUnread = n.status === 'unread';
              return (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-4 px-5 py-4 border-l-4 transition-colors',
                    cfg.border,
                    isUnread ? cfg.bg : 'bg-white dark:bg-slate-900'
                  )}
                >
                  <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
                    <Icon className={cn('h-5 w-5', cfg.color)} />
                  </div>
                  <button
                    onClick={() => handleClick(n)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', moduleColors[n.module] || moduleColors.System)}>
                        {n.module}
                      </span>
                      <Badge className={cn('border-0 text-xs', cfg.badgeCls)}>
                        {cfg.label}
                      </Badge>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{n.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{n.message}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {n.eventTime
                        ? format(parseISO(n.eventTime), "d. MMM yyyy 'kl.' HH:mm", { locale: nb })
                        : format(parseISO(n.created_date), "d. MMM yyyy 'kl.' HH:mm", { locale: nb })
                      }
                    </p>
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isUnread && (
                      <button
                        onClick={() => markReadMutation.mutate(n.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 transition-colors"
                        title="Merk som lest"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(n.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                      title="Slett"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}