import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Menu, X } from "lucide-react";

/*
  Header sticky avec logo, navigation, CTA mobiles
  Variables à remplacer :
  - {{SITE_NAME}} : Nom du site
  - {{SITE_TAGLINE}} : Baseline du site
  - {{PHONE_NUMBER}} : Numéro de téléphone
  - {{WHATSAPP_NUMBER}} : Numéro WhatsApp
  - {{NAV_ITEMS}} : Items de navigation (JSON array)
*/

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const phoneNumber = "{{PHONE_NUMBER}}";
  const whatsappNumber = "{{WHATSAPP_NUMBER}}";
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Bonjour%2C%20je%20souhaite%20un%20devis`;

  const navItems = {{NAV_ITEMS}};

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border shadow-soft">
        <div className="container">
          <div className="flex items-center justify-between h-20">
            <Link href="/">
              <a className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {{SITE_INITIALS}}
                </div>
                <div>
                  <div className="font-serif font-bold text-xl text-foreground">{{SITE_NAME}}</div>
                  <div className="text-xs text-muted-foreground">{{SITE_TAGLINE}}</div>
                </div>
              </a>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                    {item.label}
                  </a>
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Button size="sm" variant="outline" asChild className="rounded-xl">
                <a href={`tel:${phoneNumber}`}>
                  <Phone className="w-4 h-4 mr-2" />
                  Appeler
                </a>
              </Button>
              <Button size="sm" asChild className="rounded-xl bg-primary hover:bg-primary/90">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
            </div>

            <button
              className="md:hidden text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="container py-4 flex flex-col gap-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className="block py-2 text-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-soft-lg">
        <div className="container py-3 flex gap-3">
          <Button size="lg" variant="outline" asChild className="flex-1 rounded-xl">
            <a href={`tel:${phoneNumber}`}>
              <Phone className="w-5 h-5 mr-2" />
              Appeler
            </a>
          </Button>
          <Button size="lg" asChild className="flex-1 rounded-xl bg-primary hover:bg-primary/90">
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </>
  );
}
