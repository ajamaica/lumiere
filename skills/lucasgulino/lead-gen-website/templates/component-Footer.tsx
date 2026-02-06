import { Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'wouter'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-secondary/30 border-t border-border mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-serif font-semibold text-lg mb-4">{{ SITE_NAME }}</h3>
            <p className="text-sm text-muted-foreground">{{ SITE_DESCRIPTION }}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm">{{ SERVICE_LINKS }}</ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Liens</h4>
            <ul className="space-y-2 text-sm">{{ UTILITY_LINKS }}</ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <a href="tel:{{PHONE_NUMBER}}" className="hover:text-primary">
                  {{ PHONE_NUMBER }}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <a href="mailto:{{EMAIL}}" className="hover:text-primary">
                  {{ EMAIL }}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{{ LOCATION }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>
            © {currentYear} {{ SITE_NAME }}. Tous droits réservés.
          </p>
          <div className="flex gap-6">
            <Link href="/mentions-legales">
              <a className="hover:text-foreground">Mentions légales</a>
            </Link>
            <Link href="/politique-confidentialite">
              <a className="hover:text-foreground">Confidentialité</a>
            </Link>
            <Link href="/politique-cookies">
              <a className="hover:text-foreground">Cookies</a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
