import { Button } from "@/components/ui/button";
import { Phone, MessageCircle } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import ContactForm from "@/components/ContactForm";

export default function {{COMPONENT_NAME}}() {
  const phoneNumber = "{{PHONE_NUMBER}}";
  const whatsappLink = `https://wa.me/{{WHATSAPP_NUMBER}}?text={{WHATSAPP_MESSAGE}}`;

  return (
    <>
      <SEOHead
        title="{{TITLE}}"
        description="{{DESCRIPTION}}"
        canonical="{{CANONICAL}}"
      />

      <section className="bg-gradient-to-br from-secondary/30 to-accent/10 py-16 md:py-24">
        <div className="container">
          <Breadcrumbs items={[{ label: "{{BREADCRUMB_LABEL}}" }]} />
          
          <div className="max-w-4xl">
            <h1 className="font-serif font-bold text-4xl md:text-6xl text-foreground mb-6 leading-tight">
              {{H1}}
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 mb-8 leading-relaxed">
              {{INTRO}}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="rounded-xl bg-primary hover:bg-primary/90 hover-lift shadow-soft-lg">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Contacter via WhatsApp
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-xl hover-lift shadow-soft">
                <a href={`tel:${phoneNumber}`}>
                  <Phone className="w-5 h-5 mr-2" />
                  Appeler maintenant
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container max-w-4xl prose prose-lg">
          {{CONTENT}}
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-accent/10 to-primary/5">
        <div className="container max-w-3xl">
          <ContactForm />
        </div>
      </section>

      <div className="md:hidden h-24" />
    </>
  );
}
