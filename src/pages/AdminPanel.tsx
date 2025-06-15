
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const AdminPanel = () => {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <Button asChild variant="ghost" className="mb-4">
        <Link to="/profile">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Admin Panel</CardTitle>
          <CardDescription>This is a restricted area.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Welcome to the secret admin panel!</p>
          <p>More features will be available here soon.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
