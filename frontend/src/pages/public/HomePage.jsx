import HeroSection from '@components/landing/HeroSection'
import FeaturesSection from '@components/landing/FeaturesSection'
import EverywhereSection from '@components/landing/EverywhereSection'
import ModelsPreviewSection from '@components/landing/ModelsPreviewSection'
import PricingSection from '@components/landing/PricingSection'
import TestimonialsSection from '@components/landing/TestimonialsSection'
import CTASection from '@components/landing/CTASection'
import SEOHead, { StructuredData } from '@components/seo/SEOHead'
import KaliKalBanner from '@components/chat/KaliKalBanner'

export default function HomePage() {
  return (
    <>
      <KaliKalBanner />
      <SEOHead
        title="Premium Multi-Model AI Chat Platform"
        description="Access 50+ free AI models including GPT, Gemini, Llama, DeepSeek. Features Council Mode, voice chat, and developer API."
        keywords="AI chat, free AI chatbot, multi-model AI, ChatGPT alternative, Gemini alternative, Claude alternative, AI workspace, Codeva"
        path="/"
        structuredData={[StructuredData.organization(), StructuredData.website()]}
      />
      <HeroSection />
      <FeaturesSection />
      <EverywhereSection />
      <ModelsPreviewSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
    </>
  )
}
