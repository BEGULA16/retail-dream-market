
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const fetchRecipientProfile = async (recipient_id: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
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

    useEffect(() => {
        if (!user) {
            navigate('/auth', { replace: true });
        }
    }, [user, navigate]);

    const { data: recipientProfile, isLoading } = useQuery({
        queryKey: ['profile', recipientId],
        queryFn: () => fetchRecipientProfile(recipientId!),
        enabled: !!recipientId,
    });
    
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col">
                <div className="mb-8">
                    <Button asChild variant="outline">
                        <Link to="/chat">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Chat List
                        </Link>
                    </Button>
                </div>

                <div className="flex-grow border rounded-lg p-4 mb-4 flex flex-col justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-4">
                            {isLoading ? 'Loading...' : `Chat with ${recipientProfile?.username || 'user'}`}
                        </h1>
                        <div className="text-center text-muted-foreground py-8">
                            <p>This is the beginning of your conversation.</p>
                            <p className="text-sm">Note: 1-on-1 messaging is not yet implemented.</p>
                        </div>
                    </div>
                    <form className="flex gap-2 mt-4">
                        <Input
                            placeholder="Messaging is disabled for now..."
                            disabled
                        />
                        <Button type="submit" disabled>
                            <Send />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default Conversation;
