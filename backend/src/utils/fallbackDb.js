import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', '..', 'data')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

let fallbackMode = false

export function setFallbackMode(val) {
  fallbackMode = val
  if (val) {
    console.warn('⚠️ Codeva Server: MongoDB fallback mode activated. Using local JSON database.')
  }
}

export function useFallbackMode() {
  return fallbackMode
}

// Read docs from local file
function readDocs(modelName) {
  const filePath = path.join(DATA_DIR, `${modelName.toLowerCase()}.json`)
  if (!fs.existsSync(filePath)) {
    return []
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error reading database file for ${modelName}:`, error)
    return []
  }
}

// Write docs to local file
function writeDocs(modelName, docs) {
  const filePath = path.join(DATA_DIR, `${modelName.toLowerCase()}.json`)
  try {
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8')
  } catch (error) {
    console.error(`Error writing database file for ${modelName}:`, error)
  }
}

// Match query fields
function matchQuery(doc, query) {
  if (!query || Object.keys(query).length === 0) return true
  
  for (const [key, value] of Object.entries(query)) {
    // Check if the document has the field
    const docValue = doc[key]

    // Handle operator query (e.g. { $lte: date } or { $in: [...] })
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof mongoose.Types.ObjectId)) {
      for (const [op, opVal] of Object.entries(value)) {
        if (op === '$lte') {
          const docDate = docValue ? new Date(docValue) : null
          const queryDate = opVal ? new Date(opVal) : null
          if (!docDate || !queryDate || !(docDate <= queryDate)) return false
        } else if (op === '$gte') {
          const docDate = docValue ? new Date(docValue) : null
          const queryDate = opVal ? new Date(opVal) : null
          if (!docDate || !queryDate || !(docDate >= queryDate)) return false
        } else if (op === '$lt') {
          const docDate = docValue ? new Date(docValue) : null
          const queryDate = opVal ? new Date(opVal) : null
          if (!docDate || !queryDate || !(docDate < queryDate)) return false
        } else if (op === '$gt') {
          const docDate = docValue ? new Date(docValue) : null
          const queryDate = opVal ? new Date(opVal) : null
          if (!docDate || !queryDate || !(docDate > queryDate)) return false
        } else if (op === '$in') {
          if (!Array.isArray(opVal)) return false
          const docValStr = docValue ? docValue.toString() : ''
          const matches = opVal.some(item => (item ? item.toString() : '') === docValStr)
          if (!matches) return false
        } else if (op === '$ne') {
          const docValStr = docValue ? docValue.toString() : ''
          const opValStr = opVal ? opVal.toString() : ''
          if (docValStr === opValStr) return false
        }
      }
    } else {
      // Standard match
      const docValStr = docValue !== undefined && docValue !== null ? docValue.toString() : ''
      const queryValStr = value !== undefined && value !== null ? value.toString() : ''
      if (docValStr !== queryValStr) return false
    }
  }
  return true
}

// Find documents matching query
export async function findDocs(modelName, query = {}) {
  const docs = readDocs(modelName)
  return docs.filter(doc => matchQuery(doc, query))
}

// Find single document matching query
export async function findOneDoc(modelName, query = {}) {
  const docs = readDocs(modelName)
  return docs.find(doc => matchQuery(doc, query)) || null
}

// Save or insert a document
export async function saveDoc(modelName, doc) {
  const docs = readDocs(modelName)
  
  // Make sure we have a valid object representation
  const cleanDoc = doc instanceof Object ? JSON.parse(JSON.stringify(doc)) : doc
  
  if (!cleanDoc._id) {
    cleanDoc._id = new mongoose.Types.ObjectId().toString()
  } else {
    cleanDoc._id = cleanDoc._id.toString()
  }

  if (!cleanDoc.createdAt) {
    cleanDoc.createdAt = new Date().toISOString()
  }
  cleanDoc.updatedAt = new Date().toISOString()

  const index = docs.findIndex(d => d._id === cleanDoc._id)
  if (index !== -1) {
    docs[index] = cleanDoc
  } else {
    docs.push(cleanDoc)
  }

  writeDocs(modelName, docs)
  return cleanDoc
}

// Update a document in place
export async function findOneAndUpdateDoc(modelName, query, update, options = {}) {
  const docs = readDocs(modelName)
  const index = docs.findIndex(d => matchQuery(d, query))
  
  if (index === -1) {
    if (options.upsert) {
      const newDoc = { _id: new mongoose.Types.ObjectId().toString(), createdAt: new Date().toISOString() }
      applyUpdate(newDoc, update)
      docs.push(newDoc)
      writeDocs(modelName, docs)
      return newDoc
    }
    return null
  }

  const doc = docs[index]
  applyUpdate(doc, update)
  docs[index] = doc
  writeDocs(modelName, docs)
  return doc
}

// Helper to apply Mongoose update operator values
function applyUpdate(doc, update) {
  if (!update) return
  
  if (update.$set) {
    Object.assign(doc, update.$set)
  }
  if (update.$inc) {
    for (const [key, val] of Object.entries(update.$inc)) {
      doc[key] = (doc[key] || 0) + val
    }
  }
  if (update.$push) {
    for (const [key, val] of Object.entries(update.$push)) {
      if (!Array.isArray(doc[key])) {
        doc[key] = []
      }
      if (val && typeof val === 'object' && val.$each) {
        doc[key].push(...val.$each)
      } else {
        doc[key].push(val)
      }
    }
  }
  
  const hasOperators = Object.keys(update).some(k => k.startsWith('$'))
  if (!hasOperators) {
    Object.assign(doc, update)
  }

  doc.updatedAt = new Date().toISOString()
}

// Find and delete one document
export async function findOneAndDeleteDoc(modelName, query) {
  const docs = readDocs(modelName)
  const index = docs.findIndex(d => matchQuery(d, query))
  if (index === -1) return null

  const deleted = docs.splice(index, 1)[0]
  writeDocs(modelName, docs)
  return deleted
}

// Delete multiple documents
export async function deleteManyDocs(modelName, query) {
  const docs = readDocs(modelName)
  const initialCount = docs.length
  const remaining = docs.filter(d => !matchQuery(d, query))
  writeDocs(modelName, remaining)
  return { deletedCount: initialCount - remaining.length }
}

// Update multiple documents
export async function updateManyDocs(modelName, query, update, options = {}) {
  const docs = readDocs(modelName)
  let updatedCount = 0
  for (const doc of docs) {
    if (matchQuery(doc, query)) {
      applyUpdate(doc, update)
      updatedCount++
    }
  }
  if (updatedCount > 0) {
    writeDocs(modelName, docs)
  }
  return { modifiedCount: updatedCount, matchedCount: updatedCount }
}

// Insert multiple documents
export async function insertManyDocs(modelName, docsArray) {
  const docs = readDocs(modelName)
  const inserted = []

  for (const item of docsArray) {
    const cleanDoc = JSON.parse(JSON.stringify(item))
    if (!cleanDoc._id) {
      cleanDoc._id = new mongoose.Types.ObjectId().toString()
    } else {
      cleanDoc._id = cleanDoc._id.toString()
    }
    cleanDoc.createdAt = cleanDoc.createdAt || new Date().toISOString()
    cleanDoc.updatedAt = new Date().toISOString()
    
    docs.push(cleanDoc)
    inserted.push(cleanDoc)
  }

  writeDocs(modelName, docs)
  return inserted
}

// Count documents
export async function countDocs(modelName, query) {
  const matches = await findDocs(modelName, query)
  return matches.length
}

class FallbackQuery {
  constructor(promise) {
    this.promise = promise
  }
  then(onfulfilled, onrejected) {
    return this.promise.then(onfulfilled, onrejected)
  }
  catch(onrejected) {
    return this.promise.catch(onrejected)
  }
  sort(options) {
    this.promise = this.promise.then(results => {
      if (!Array.isArray(results)) return results
      const key = Object.keys(options)[0]
      const direction = options[key]
      return [...results].sort((a, b) => {
        const valA = a[key]
        const valB = b[key]
        if (valA === valB) return 0
        if (valA === undefined || valA === null) return 1
        if (valB === undefined || valB === null) return -1
        if (direction === -1 || direction === 'desc' || direction === 'descending') {
          return valA < valB ? 1 : -1
        } else {
          return valA > valB ? 1 : -1
        }
      })
    })
    return this
  }
  limit(num) {
    this.promise = this.promise.then(results => {
      if (!Array.isArray(results)) return results
      return results.slice(0, num)
    })
    return this
  }
  skip(num) {
    this.promise = this.promise.then(results => {
      if (!Array.isArray(results)) return results
      return results.slice(num)
    })
    return this
  }
  populate() {
    return this
  }
  exec() {
    return this.promise
  }
}

// Construct standard Model class proxy
function createFallbackModel(modelName, schema) {
  class FallbackModel {
    constructor(data = {}) {
      // Setup default schema values
      if (schema && schema.paths) {
        for (const [key, pathConfig] of Object.entries(schema.paths)) {
          if (pathConfig.defaultValue !== undefined) {
            this[key] = typeof pathConfig.defaultValue === 'function' 
              ? pathConfig.defaultValue() 
              : pathConfig.defaultValue
          }
        }
      }
      
      Object.assign(this, data)
      if (!this._id) {
        this._id = new mongoose.Types.ObjectId().toString()
      } else {
        this._id = this._id.toString()
      }
      if (!this.createdAt) {
        this.createdAt = new Date().toISOString()
      }
      if (!this.updatedAt) {
        this.updatedAt = new Date().toISOString()
      }
    }

    async save() {
      const saved = await saveDoc(modelName, this)
      // Update properties in case they were generated
      Object.assign(this, saved)
      return this
    }

    async deleteOne() {
      return findOneAndDeleteDoc(modelName, { _id: this._id })
    }

    toObject() {
      const obj = {}
      for (const key of Object.keys(this)) {
        obj[key] = this[key]
      }
      return obj
    }

    toJSON() {
      return this.toObject()
    }
  }

  FallbackModel.find = (query) => new FallbackQuery(findDocs(modelName, query))
  FallbackModel.findOne = (query) => new FallbackQuery(findOneDoc(modelName, query))
  FallbackModel.findById = (id) => new FallbackQuery(findOneDoc(modelName, { _id: id }))
  FallbackModel.findOneAndUpdate = (query, update, options) => new FallbackQuery(findOneAndUpdateDoc(modelName, query, update, options))
  FallbackModel.findByIdAndUpdate = (id, update, options) => new FallbackQuery(findOneAndUpdateDoc(modelName, { _id: id }, update, options))
  FallbackModel.updateOne = (query, update, options) => new FallbackQuery(findOneAndUpdateDoc(modelName, query, update, options))
  FallbackModel.updateMany = (query, update, options) => new FallbackQuery(updateManyDocs(modelName, query, update, options))
  FallbackModel.findOneAndDelete = (query) => new FallbackQuery(findOneAndDeleteDoc(modelName, query))
  FallbackModel.findByIdAndDelete = (id) => new FallbackQuery(findOneAndDeleteDoc(modelName, { _id: id }))
  FallbackModel.deleteMany = (query) => new FallbackQuery(deleteManyDocs(modelName, query))
  FallbackModel.insertMany = (docs) => insertManyDocs(modelName, docs)
  FallbackModel.countDocuments = (query) => new FallbackQuery(countDocs(modelName, query))
  FallbackModel.create = async (data) => {
    const instance = new FallbackModel(data)
    await instance.save()
    return instance
  }
  FallbackModel.schema = schema

  // Mirror user-defined schema statics (e.g. ApiKey.generate / ApiKey.hashKey)
  // and instance methods (e.g. doc.masked()) so app code behaves identically
  // whether MongoDB is live or the JSON fallback is active.
  if (schema && schema.statics) {
    for (const [name, fn] of Object.entries(schema.statics)) {
      FallbackModel[name] = fn.bind(FallbackModel)
    }
  }
  if (schema && schema.methods) {
    for (const [name, fn] of Object.entries(schema.methods)) {
      FallbackModel.prototype[name] = fn
    }
  }

  return FallbackModel
}

// Global wrap/patch on Mongoose
export function patchMongoose() {
  const originalModel = mongoose.model
  mongoose.model = function(name, schema) {
    const originalM = originalModel.apply(this, arguments)
    const fallbackM = createFallbackModel(name, schema)

    const handler = {
      get(target, prop, receiver) {
        if (useFallbackMode()) {
          return Reflect.get(fallbackM, prop, receiver)
        }
        return Reflect.get(target, prop, receiver)
      },
      construct(target, args) {
        if (useFallbackMode()) {
          return Reflect.construct(fallbackM, args)
        }
        return Reflect.construct(target, args)
      }
    }

    return new Proxy(originalM, handler)
  }
}
