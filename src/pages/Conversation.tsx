import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, ArrowLeft, Image as ImageIcon, X } from 'lucide-react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMessages } from '@/hooks/useMessages';
import MessageBubble from '@/components/MessageBubble';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const fetchRecipientProfile = async (recipient_id: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, badge')
        .eq('id', recipient_id)
        .single();
    
    if (error) {
        console.error('Error fetching recipient profile', error);
        throw new Error(error.message);
    }
    return data;
}

const Conversation = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { recipientId } = useParams<{ recipientId: string }>();
    const location = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { prefilledMessage, prefilledImage, autoSend } = location.state || {};
    const [newMessage, setNewMessage] = useState(prefilledMessage && !autoSend ? prefilledMessage : '');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [lastMessageTime, setLastMessageTime] = useState(0);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) {
            navigate('/auth', { replace: true });
        }
    }, [user, navigate]);

    const { data: recipientProfile, isLoading: profileLoading } = useQuery({
        queryKey: ['profile', recipientId],
        queryFn: () => fetchRecipientProfile(recipientId!),
        enabled: !!recipientId,
    });
    
    const { messages, isLoading: messagesLoading } = useMessages(recipientId!);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const sendMessage = async (content: string | null, imageUrl: string | null, imageFileToSend: File | null) => {
        if (!user || (!content?.trim() && !imageUrl && !imageFileToSend)) return false;

        if (user.email !== 'damiankehnan@proton.me') {
            const now = Date.now();
            if (now - lastMessageTime < 4000) {
                toast({
                    variant: 'destructive',
                    title: 'You are sending messages too fast!',
                    description: 'Please wait a moment before sending another message.',
                });
                return false;
            }
        }

        setIsSending(true);
        let finalImageUrl: string | null = imageUrl;

        try {
            if (imageFileToSend) {
                if (imageFileToSend.size > 2 * 1024 * 1024) { // 2MB limit
                    toast({ variant: 'destructive', title: 'Image too large', description: 'Please select an image smaller than 2MB.' });
                    setIsSending(false);
                    return false;
                }
                const fileExt = imageFileToSend.name.split('.').pop();
                const filePath = `${user.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('messages').upload(filePath, imageFileToSend);
                if (uploadError) throw uploadError;
                
                const { data } = supabase.storage.from('messages').getPublicUrl(filePath);
                finalImageUrl = data.publicUrl;
            }

            const { error } = await supabase
                .from('messages')
                .insert({
                    sender_id: user.id,
                    recipient_id: recipientId!,
                    content: content ? content.trim() : null,
                    image_url: finalImageUrl,
                }).select().single();

            if (error) throw error;
            
            setLastMessageTime(Date.now());
            queryClient.invalidateQueries({ queryKey: ['messages', user.id, recipientId] });
            return true;

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error sending message', description: error.message });
            return false;
        } finally {
            setIsSending(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        if (autoSend && prefilledMessage && user && recipientId) {
            const send = async () => {
                if (!isMounted) return;
                
                toast({
                    title: "Sending your interest...",
                    description: "The seller will be notified shortly.",
                });
                
                await sendMessage(prefilledMessage, prefilledImage, null);
                
                if (isMounted) {
                    navigate(location.pathname, { replace: true, state: {} });
                }
            };
            send();
        }
        return () => { isMounted = false; };
    }, [autoSend, prefilledMessage, prefilledImage, user, recipientId, navigate, location.pathname]);

    const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
        e.preventDefault();
        const success = await sendMessage(newMessage, null, imageFile);
        if (success) {
            setNewMessage('');
            setImageFile(null);
            if (imageInputRef.current) imageInputRef.current.value = "";
        }
    };
    
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                    <Button asChild variant="outline" size="sm">
                        <Link to="/chat">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Chats
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{profileLoading ? '...' : recipientProfile?.username}</span>
                            {!profileLoading && recipientProfile?.badge && <Badge variant="secondary">{recipientProfile.badge}</Badge>}
                        </div>
                        <Avatar>
                            <AvatarImage src={recipientProfile?.avatar_url ?? undefined} />
                            <AvatarFallback>{recipientProfile?.username?.[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                </div>

                <div className="flex-grow border rounded-lg p-4 mb-4 flex flex-col justify-between">
                    <ScrollArea className="flex-grow h-[calc(100vh-320px)]" ref={scrollAreaRef}>
                         <div className="px-4">
                            {messagesLoading ? (
                                <p className="text-center text-muted-foreground py-8">Loading messages...</p>
                            ) : messages.length > 0 ? (
                                messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    <p>This is the beginning of your conversation.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="mt-4">
                        {imageFile && (
                            <div className="relative w-24 h-24 mb-2">
                                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover rounded-md" />
                                <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => setImageFile(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <form className="flex items-start gap-2" onSubmit={handleSendMessage}>
                             <Button type="button" variant="outline" size="icon" onClick={() => imageInputRef.current?.click()}>
                                <ImageIcon />
                                <span className="sr-only">Add Image</span>
                            </Button>
                            <Input
                                type="file"
                                accept="image/*"
                                ref={imageInputRef}
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            <Textarea
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                disabled={isSending}
                                className="flex-1 resize-none"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                            />
                            <Button type="submit" disabled={isSending || (!newMessage.trim() && !imageFile)}>
                                {isSending ? '...' : <Send />}
                                <span className="sr-only">Send</span>
                            </Button>
                        </form>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default Conversation;
