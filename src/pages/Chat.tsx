
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: number;
  created_at: string;
  content: string | null;
  user_id: string;
  profiles: {
    email: string | null;
  } | null;
}

const fetchMessages = async (): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles(email)')
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth', { replace: true });
    }
  }, [user, navigate]);

  const { data: messages, isLoading } = useQuery<Message[]>({
      queryKey: ['messages'],
      queryFn: fetchMessages,
      enabled: !!user,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user) return;

    const { error } = await supabase
      .from('messages')
      .insert([{ content: newMessage.trim(), user_id: user.id }]);
    
    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading user...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col">
        <div className="mb-8 flex justify-between items-center">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-4">Real-time Chat</h1>
        <div className="flex-grow border rounded-lg p-4 mb-4 overflow-y-auto h-96 flex flex-col">
          <div className="space-y-4">
            {isLoading && <p className="text-center text-muted-foreground">Loading messages...</p>}
            {messages?.map((message) => {
              const isSender = message.user_id === user.id;
              return (
                <div key={message.id} className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
                  {!isSender && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{message.profiles?.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`p-3 rounded-lg max-w-xs ${isSender ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {!isSender && <p className="text-xs font-bold mb-1">{message.profiles?.email}</p>}
                    <p>{message.content}</p>
                  </div>
                </div>
              )
            })}
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
          <Button type="submit" disabled={!newMessage.trim() || isLoading}>
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
