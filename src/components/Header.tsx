import { Building2 } from 'lucide-react';

const Header = () => {
  return (
    <header className="gradient-navy px-6 py-5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-emerald flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-primary-foreground tracking-tight">
              Pro Inmobi
            </h1>
            <p className="text-xs text-primary-foreground/70 font-medium">
              Opinión de Valor
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-primary-foreground/60">
          <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
          Sistema Activo
        </div>
      </div>
    </header>
  );
};

export default Header;
