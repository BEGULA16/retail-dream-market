
import { Ban } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface BannedPageProps {
  bannedUntil: string | null;
}

const BannedPage = ({ bannedUntil }: BannedPageProps) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (bannedUntil) {
      const updateTimer = () => {
        const endDate = new Date(bannedUntil);
        if (endDate > new Date()) {
          setTimeLeft(formatDistanceToNow(endDate, { addSuffix: true }));
        } else {
          setTimeLeft('now.');
          // Force a page reload to trigger re-authentication and profile check
          setTimeout(() => window.location.reload(), 2000);
        }
      };

      updateTimer();
      const intervalId = setInterval(updateTimer, 1000);
      return () => clearInterval(intervalId);
    }
  }, [bannedUntil]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
      <Ban className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-3xl font-bold text-destructive">You are Banned</h1>
      {bannedUntil ? (
        <p className="mt-2 text-muted-foreground">
          Your access to this site has been temporarily restricted.
          <br />
          Your restriction will be lifted {timeLeft}.
        </p>
      ) : (
        <p className="mt-2 text-muted-foreground">
          Your access to this site has been permanently suspended due to a violation of our terms of service.
        </p>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        If you believe this is a mistake, please contact support.
      </p>
    </div>
  );
};

export default BannedPage;
