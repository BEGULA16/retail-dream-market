
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Message } from '@/hooks/useMessages';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const { user } = useAuth();
  const isSender = message.sender_id === user?.id;

  return (
    <div className={cn('flex items-end gap-2 my-2', isSender ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'flex flex-col gap-1 rounded-lg px-3 py-2 text-sm max-w-[75%]',
        isSender ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}>
        {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
        {message.image_url && (
            <img 
                src={message.image_url} 
                alt="Sent media" 
                className="rounded-lg max-w-xs max-h-xs object-cover mt-1"
            />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
