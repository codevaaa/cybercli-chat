import mongoose from 'mongoose'

const codicAuthHandoffSchema = new mongoose.Schema({
  ticket_hash: { type: String, required: true, unique: true, index: true },
  challenge: { type: String, required: true, minlength: 43, maxlength: 43 },
  encrypted_session: { type: String, required: true, maxlength: 32_768 },
  expires_at: { type: Date, required: true },
}, { timestamps: true, minimize: true })

codicAuthHandoffSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('CodicAuthHandoff', codicAuthHandoffSchema)
