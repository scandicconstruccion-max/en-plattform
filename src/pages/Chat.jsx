import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import { MessageSquare, Send, Hash, Users, Plus } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const defaultChannels = [
  { id: 'general', name: 'Generelt', icon: Hash },
  { id: 'prosjekter', name: 'Prosjekter', icon: Hash },
  { id: 'hms', name: 'HMS', icon: Hash },
];

export default function Chat() {
  const [activeChannel, setActiveChannel] = useState('general');
  const [message, setMessage] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const messagesEndRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chatMessages', activeChannel],
    queryFn: () => base44.entities.ChatMessage.filter({ channel: activeChannel }, '-created_date', 100),
    refetchInterval: 3000, // Poll every 3 seconds
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', activeChannel] });
      setMessage('');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMutation.mutate({
      channel: activeChannel,
      sender_email: user?.email,
      sender_name: user?.full_name,
      message: message.trim()
    });
  };

  const formatMessageDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return `I går ${format(d, 'HH:mm')}`;
    return format(d, 'd. MMM HH:mm', { locale: nb });
  };

  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.created_date) - new Date(b.created_date)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PageHeader
        title="Intern Chat"
        subtitle="Kommuniser med teamet"
      />

      <div className="flex-1 flex overflow-hidden px-6 lg:px-8 py-6">
        <div className="flex gap-6 w-full h-[calc(100vh-180px)]">
          {/* Channels Sidebar */}
          <Card className="w-64 border-0 shadow-sm flex-shrink-0 flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Kanaler</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {defaultChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors",
                      activeChannel === channel.id
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <channel.icon className="h-4 w-4" />
                    <span className="font-medium">{channel.name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Online Users */}
            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                <Users className="h-4 w-4" />
                <span>Brukere ({allUsers.length})</span>
              </div>
              <div className="space-y-2">
                {allUsers.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                        {u.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-slate-600 truncate">{u.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="flex-1 border-0 shadow-sm flex flex-col overflow-hidden">
            {/* Channel Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-slate-400" />
                <h2 className="font-semibold text-slate-900">
                  {defaultChannels.find(c => c.id === activeChannel)?.name || activeChannel}
                </h2>
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-48 rounded-xl">
                  <SelectValue placeholder="Prosjekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle prosjekter</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
              ) : sortedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-slate-500">Ingen meldinger ennå</p>
                  <p className="text-sm text-slate-400">Start samtalen!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedMessages.map((msg, index) => {
                    const isOwn = msg.sender_email === user?.email;
                    const showAvatar = index === 0 || 
                      sortedMessages[index - 1]?.sender_email !== msg.sender_email;

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          isOwn && "flex-row-reverse"
                        )}
                      >
                        {showAvatar ? (
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarFallback className={cn(
                              "text-sm",
                              isOwn ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                            )}>
                              {msg.sender_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-9" />
                        )}
                        <div className={cn("max-w-[70%]", isOwn && "text-right")}>
                          {showAvatar && (
                            <div className={cn(
                              "flex items-center gap-2 mb-1",
                              isOwn && "flex-row-reverse"
                            )}>
                              <span className="text-sm font-medium text-slate-900">
                                {msg.sender_name}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatMessageDate(msg.created_date)}
                              </span>
                            </div>
                          )}
                          <div className={cn(
                            "inline-block px-4 py-2.5 rounded-2xl",
                            isOwn 
                              ? "bg-emerald-600 text-white rounded-tr-sm" 
                              : "bg-slate-100 text-slate-900 rounded-tl-sm"
                          )}>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-100">
              <div className="flex gap-3">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Skriv en melding..."
                  className="flex-1 rounded-xl border-slate-200"
                />
                <Button 
                  type="submit"
                  disabled={!message.trim() || sendMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}