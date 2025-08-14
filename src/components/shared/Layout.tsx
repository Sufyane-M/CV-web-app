import React from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  showHeader = true, 
  showFooter = true,
  className = '' 
}) => {
  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      {showHeader && <Header />}
      
      <main className="flex-1">
        {children}
      </main>
      
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;