import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Hash, Users, Paperclip, Image, X } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ChatWindow({ group, user }) {
  const [message, setMessage] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const channelId = `group_${group.id}`;

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chatMessages', channelId],
    queryFn: () => base44.entities.ChatMessage.filter({ channel: channelId }, 'created_date', 200),
    refetchInterval: 3000,
    enabled: !!group.id,
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', channelId] });
      setMessage('');
      setAttachmentFile(null);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() && !attachmentFile) return;

    let attachmentUrl = null;
    if (attachmentFile) {
      setUploadingFile(true);
      try {
        const result = await base44.integrations.Core.UploadFile({ file: attachmentFile });
        attachmentUrl = result.file_url;
      } catch {
        toast.error('Feil ved opplasting av fil');
        setUploadingFile(false);
        return;
      }
      setUploadingFile(false);
    }

    sendMutation.mutate({
      channel: channelId,
      sender_email: user?.email,
      sender_name: user?.full_name,
      message: message.trim() || (attachmentFile ? attachmentFile.name : ''),
      attachment_url: attachmentUrl,
    });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return `I går ${format(d, 'HH:mm')}`;
    return format(d, 'd. MMM HH:mm', { locale: nb });
  };

  const isImageUrl = (url) => url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Hash className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{group.name}</h2>
            <p className="text-xs text-slate-500">
              {group.project_name} · {group.members?.length || 0} medlemmer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {group.description && (
            <p className="text-xs text-slate-400 hidden md:block max-w-xs truncate">{group.description}</p>
          )}
          <Badge variant="outline" className="text-xs gap-1">
            <Users className="h-3 w-3" />
            {group.members?.length || 0}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-5 py-4">
        {isLoading ? (
          <div className="flex justify-center pt-8">
            <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <Hash className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="font-medium text-slate-700">Ingen meldinger ennå</p>
            <p className="text-sm text-slate-400 mt-1">Send den første meldingen i {group.name}!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, index) => {
              const isOwn = msg.sender_email === user?.email;
              const showAvatar = index === 0 || messages[index - 1]?.sender_email !== msg.sender_email;

              return (
                <div key={msg.id} className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
                  {showAvatar ? (
                    <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                      <AvatarFallback className={cn(
                        "text-xs font-medium",
                        isOwn ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {msg.sender_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8" />
                  )}
                  <div className={cn("max-w-[72%]", isOwn && "items-end flex flex-col")}>
                    {showAvatar && (
                      <div className={cn("flex items-center gap-2 mb-1", isOwn && "flex-row-reverse")}>
                        <span className="text-xs font-semibold text-slate-700">{msg.sender_name}</span>
                        <span className="text-xs text-slate-400">{formatDate(msg.created_date)}</span>
                      </div>
                    )}
                    {msg.message && (
                      <div className={cn(
                        "inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                        isOwn
                          ? "bg-emerald-600 text-white rounded-tr-sm"
                          : "bg-white border border-slate-100 text-slate-900 rounded-tl-sm shadow-sm"
                      )}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    )}
                    {msg.attachment_url && (
                      <div className="mt-1">
                        {isImageUrl(msg.attachment_url) ? (
                          <img
                            src={msg.attachment_url}
                            alt="Vedlegg"
                            className="max-w-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.attachment_url, '_blank')}
                          />
                        ) : (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors",
                              isOwn
                                ? "bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-400"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <Paperclip className="h-4 w-4" />
                            Vedlegg
                          </a>
                        )}
                      </div>
                    )}
                    {!showAvatar && (
                      <p className={cn("text-xs text-slate-400 mt-0.5", isOwn && "text-right")}>
                        {formatDate(msg.created_date)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* File preview */}
      {attachmentFile && (
        <div className="px-5 pb-0 pt-2">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 text-sm text-slate-700">
            <Paperclip className="h-4 w-4 text-slate-500" />
            <span className="flex-1 truncate">{attachmentFile.name}</span>
            <button onClick={() => setAttachmentFile(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-100">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => setAttachmentFile(e.target.files[0] || null)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Melding til ${group.name}...`}
            className="flex-1 rounded-xl border-slate-200"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={(!message.trim() && !attachmentFile) || sendMutation.isPending || uploadingFile}
            className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-4 flex-shrink-0"
          >
            {uploadingFile ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}