import HeroSection from '@components/landing/HeroSection'
import FeaturesSection from '@components/landing/FeaturesSection'
import ModelsPreviewSection from '@components/landing/ModelsPreviewSection'
import PricingSection from '@components/landing/PricingSection'
import TestimonialsSection from '@components/landing/TestimonialsSection'
import CTASection from '@components/landing/CTASection'
import SEOHead, { StructuredData } from '@components/seo/SEOHead'

export default function HomePage() {
  return (
    <>
      <SEOHead
        title="Premium Multi-Model AI Chat Platform"
        description="Access 50+ free AI models including GPT, Gemini, Llama, DeepSeek. Features Council Mode, voice chat, and developer API."
        keywords="AI chat, free AI chatbot, multi-model AI, ChatGPT alternative, Gemini alternative, Claude alternative, AI workspace, CyberMindCLI"
        path="/"
        structuredData={[StructuredData.organization(), StructuredData.website()]}
      />
      <HeroSection />
      <FeaturesSection />
      <ModelsPreviewSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
    </>
  )
}
