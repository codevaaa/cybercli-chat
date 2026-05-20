import HeroSection from '@components/landing/HeroSection'
import FeaturesSection from '@components/landing/FeaturesSection'
import ModelsPreviewSection from '@components/landing/ModelsPreviewSection'
import PricingSection from '@components/landing/PricingSection'
import TestimonialsSection from '@components/landing/TestimonialsSection'
import CTASection from '@components/landing/CTASection'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <ModelsPreviewSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
    </>
  )
}
