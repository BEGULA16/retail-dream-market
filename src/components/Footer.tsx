
const Footer = () => {
  return (
    <footer className="bg-muted/40 border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RetailDream. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
