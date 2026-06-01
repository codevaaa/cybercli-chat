import express from 'express'
import { getStyles, createStyle, updateStyle, deleteStyle } from '../controllers/styles.controller.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.use(requireAuth)

router.get('/', getStyles)
router.post('/', createStyle)
router.put('/:id', updateStyle)
router.delete('/:id', deleteStyle)

export default router
