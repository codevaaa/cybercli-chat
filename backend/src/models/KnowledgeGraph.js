import mongoose from 'mongoose'

const SkillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { type: Number, min: 1, max: 5, default: 1 },
  proficiency: { type: Number, min: 0, max: 1, default: 0 },
  last_used: { type: Date, default: Date.now },
  projects: [{ type: String }],
  patterns: [{ type: String }],
  confidence: { type: Number, min: 0, max: 1, default: 0.5 }
})

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  technologies: [{ type: String }],
  complexity: { type: String, enum: ['low', 'medium', 'high', 'expert'], default: 'medium' },
  patterns_detected: [{ type: String }],
  code_quality_score: { type: Number, min: 0, max: 1, default: 0 },
  analyzed_at: { type: Date, default: Date.now }
})

const CodingPatternsSchema = new mongoose.Schema({
  preferred_languages: [{ type: String }],
  architecture_style: { type: String },
  testing_approach: { type: String },
  documentation_habit: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  code_style_preferences: {
    indentation: { type: String, enum: ['spaces', 'tabs'], default: 'spaces' },
    semicolons: { type: Boolean, default: true },
    quotes: { type: String, enum: ['single', 'double', 'backtick'], default: 'single' },
    max_line_length: { type: Number, default: 100 }
  }
})

const LearningVelocitySchema = new mongoose.Schema({
  new_skills_per_week: { type: Number, default: 0 },
  retention_rate: { type: Number, min: 0, max: 1, default: 0 },
  application_rate: { type: Number, min: 0, max: 1, default: 0 },
  last_calculated: { type: Date, default: Date.now }
})

const KnowledgeGraphSchema = new mongoose.Schema({
  user_id: { 
    type: String, 
    required: true, 
    index: true,
    unique: true
  },
  skills: [SkillSchema],
  projects: [ProjectSchema],
  coding_patterns: CodingPatternsSchema,
  learning_velocity: LearningVelocitySchema,
  context_embeddings: [{
    type: { type: String },
    content: String,
    embedding: [Number],
    created_at: { type: Date, default: Date.now }
  }],
  recent_contexts: [{
    prompt: String,
    response_summary: String,
    technologies: [String],
    created_at: { type: Date, default: Date.now }
  }],
  recommendations: [{
    type: { type: String, enum: ['skill', 'tool', 'pattern', 'resource'] },
    content: String,
    priority: { type: Number, min: 1, max: 5, default: 3 },
    generated_at: { type: Date, default: Date.now }
  }],
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

// Indexes for performance
KnowledgeGraphSchema.index({ user_id: 1, 'skills.name': 1 })
KnowledgeGraphSchema.index({ user_id: 1, 'projects.name': 1 })
KnowledgeGraphSchema.index({ user_id: 1, 'coding_patterns.preferred_languages': 1 })
KnowledgeGraphSchema.index({ updated_at: -1 })

// Method to update skills from interaction
KnowledgeGraphSchema.methods.updateSkills = async function(technologies, codeQuality) {
  const now = new Date()
  
  for (const tech of technologies) {
    const existingSkill = this.skills.find(s => s.name.toLowerCase() === tech.toLowerCase())
    
    if (existingSkill) {
      existingSkill.proficiency = Math.min(1, existingSkill.proficiency + 0.05)
      existingSkill.last_used = now
      existingSkill.confidence = Math.min(1, existingSkill.confidence + 0.02)
    } else {
      this.skills.push({
        name: tech,
        level: 1,
        proficiency: codeQuality * 0.5,
        last_used: now,
        confidence: 0.3
      })
    }
  }
  
  this.updated_at = now
  return this.save()
}

// Method to get context for AI prompts
KnowledgeGraphSchema.methods.getContextForPrompt = function(currentPrompt) {
  const technologies = this.skills
    .sort((a, b) => b.proficiency - a.proficiency)
    .slice(0, 5)
    .map(s => s.name)
  
  const recentProjects = this.projects
    .sort((a, b) => b.analyzed_at - a.analyzed_at)
    .slice(0, 3)
    .map(p => p.name)
  
  const recentContexts = this.recent_contexts
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 5)
  
  return {
    preferredLanguages: this.coding_patterns?.preferred_languages || [],
    technologies,
    recentProjects,
    codingStyle: this.coding_patterns?.architecture_style,
    recentContexts,
    similarPastTasks: recentContexts.filter(ctx => 
      currentPrompt.toLowerCase().includes(ctx.technologies[0]?.toLowerCase())
    )
  }
}

const KnowledgeGraph = mongoose.model('KnowledgeGraph', KnowledgeGraphSchema)

export default KnowledgeGraph
