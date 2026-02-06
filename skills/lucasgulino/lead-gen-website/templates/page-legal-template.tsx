import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function {{COMPONENT_NAME}}() {
  return (
    <>
      <SEOHead
        title="{{TITLE}}"
        description="{{DESCRIPTION}}"
        canonical="{{CANONICAL}}"
      />

      <section className="bg-gradient-to-br from-secondary/30 to-accent/10 py-16">
        <div className="container">
          <Breadcrumbs items={[{ label: "{{BREADCRUMB_LABEL}}" }]} />
          <h1 className="font-serif font-bold text-4xl text-foreground">{{H1}}</h1>
        </div>
      </section>

      <section className="py-20">
        <div className="container max-w-4xl prose prose-lg">
          {{CONTENT}}
        </div>
      </section>
    </>
  );
}
