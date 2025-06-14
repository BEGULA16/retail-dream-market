
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Message {
  id: number;
  created_at: string;
  content: string | null;
}

const fetchMessages = async (): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching messages:', error);
    throw new Error(error.message);
  }
  return data.reverse();
};

const Chat = () => {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const { data: messages, isLoading } = useQuery<Message[]>({
      queryKey: ['messages'],
      queryFn: fetchMessages,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          queryClient.setQueryData(['messages'], (oldData: Message[] | undefined) => {
            const newData = payload.new as Message;
            return oldData ? [...oldData, newData] : [newData];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const { error } = await supabase
      .from('messages')
      .insert([{ content: newMessage.trim() }]);
    
    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col">
        <div className="mb-8">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-4">Real-time Chat</h1>
        <div className="flex-grow border rounded-lg p-4 mb-4 overflow-y-auto h-96 flex flex-col">
          <div className="space-y-4">
            {isLoading && <p className="text-center text-muted-foreground">Loading messages...</p>}
            {messages?.map((message) => (
              <div key={message.id} className="flex">
                <div className="bg-muted p-3 rounded-lg max-w-xs">
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            autoComplete="off"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            <Send />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default Chat;
