import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
    utm_source: '',
    utm_campaign: '',
    utm_adset: '',
    utm_ad: '',
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setFormData((prev) => ({
      ...prev,
      utm_source: params.get('utm_source') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_adset: params.get('utm_adset') || '',
      utm_ad: params.get('utm_ad') || '',
    }))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    toast.success('Message envoyé ! Nous vous recontacterons rapidement.')
    setFormData({
      name: '',
      phone: '',
      email: '',
      message: '',
      utm_source: '',
      utm_campaign: '',
      utm_adset: '',
      utm_ad: '',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-soft-lg p-8 space-y-6">
      <div>
        <h2 className="font-serif font-semibold text-2xl md:text-3xl text-foreground mb-2">
          Demander un Devis
        </h2>
        <p className="text-muted-foreground">
          Remplissez le formulaire et nous vous recontacterons rapidement.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nom complet *</Label>
          <Input
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="phone">Téléphone *</Label>
          <Input
            id="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="message">Message *</Label>
          <Textarea
            id="message"
            required
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="rounded-xl"
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full rounded-xl bg-primary hover:bg-primary/90">
        Envoyer la demande
      </Button>
    </form>
  )
}
