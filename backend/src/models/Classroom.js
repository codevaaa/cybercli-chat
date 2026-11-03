import mongoose from 'mongoose'

const classroomSchema = new mongoose.Schema({
  teacher_id: { type: String, required: true, index: true },
  source_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  prompt_original: { type: String, required: true },
  locked_spec: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
  design: { type: mongoose.Schema.Types.Mixed, required: true },
  pack: { type: String, enum: ['general', 'cs', 'commerce'], required: true },
  deadline: { type: Date, required: true },
  student_ids: { type: [String], required: true },
  consent: { teacher: { type: Boolean, default: false }, school: { type: Boolean, default: false } },
}, { timestamps: true })
export default mongoose.model('Classroom', classroomSchema)
