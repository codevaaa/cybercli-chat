export const getMe = (req, res) => {
  res.json({ user: req.user })
}

export const refreshToken = (req, res) => {
  res.json({ message: 'Token refresh' })
}

export const revokeSession = (req, res) => {
  res.json({ message: 'Session revoked', id: req.params.id })
}
