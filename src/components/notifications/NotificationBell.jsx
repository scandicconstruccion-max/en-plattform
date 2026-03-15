import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, ExternalLink, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

const typeConfig = {
  info: { icon: Info, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', dot: 'bg-emerald-500', border: 'border-l-emerald-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', dot: 'bg-amber-500', border: 'border-l-amber-500' },
  critical: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', dot: 'bg-red-500', border: 'border-l-red-500' },
};

const moduleColors = {
  Anbud: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  CRM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Avvik: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Sjekklister: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  Ressursplan: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  Faktura: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Ordre: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  Chat: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  System: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default function NotificationBell({ userEmail }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: () => userEmail
      ? base44.entities.Notification.filter({ userEmail }, '-created_date', 20)
      : base44.entities.Notification.list('-created_date', 20),
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

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

  useEffect(() => {
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create') {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = (n) => {
    markReadMutation.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-[4.5rem] sm:top-12 w-auto sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-white text-sm">Varsler</span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} ulest
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Merk alle lest
                </button>
              )}
              <button
                onClick={() => { setOpen(false); navigate('/Varsler'); }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Se alle
              </button>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Ingen varsler</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = typeConfig[n.type] || typeConfig.info;
                const Icon = cfg.icon;
                const isUnread = n.status === 'unread';
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-l-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                      cfg.border,
                      isUnread ? cfg.bg : 'bg-white dark:bg-slate-900'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                        <Icon className={cn('h-4 w-4', cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', moduleColors[n.module] || moduleColors.System)}>
                            {n.module}
                          </span>
                          {isUnread && <span className={cn('h-2 w-2 rounded-full flex-shrink-0', cfg.dot)} />}
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{n.message}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {n.eventTime
                            ? formatDistanceToNow(parseISO(n.eventTime), { addSuffix: true, locale: nb })
                            : formatDistanceToNow(parseISO(n.created_date), { addSuffix: true, locale: nb })
                          }
                        </p>
                      </div>
                      {n.link && <ExternalLink className="h-3.5 w-3.5 text-slate-300 flex-shrink-0 mt-1" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}