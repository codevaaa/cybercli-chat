/**
 * Middleware to ensure the user has enough credits to make an API request.
 * Free tier receives daily credits (e.g., 1000). Pro/Enterprise have larger limits.
 */
export const requireCredits = async (req, res, next) => {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({
        error: {
          message: "Authentication required to check credits.",
          type: "invalid_request_error"
        }
      })
    }

    // For simplicity right now, if credits <= 0, deny access.
    // In production, we might calculate estimated cost of prompt before denying.
    if (user.credits <= 0) {
      return res.status(402).json({
        error: {
          message: "Insufficient Codeva Credits. Please upgrade your plan or purchase more credits.",
          type: "insufficient_quota",
          code: "insufficient_credits"
        }
      })
    }

    next()
  } catch (error) {
    console.error('Credits Guard Error:', error)
    res.status(500).json({
      error: {
        message: "Internal server error during credit check.",
        type: "api_error"
      }
    })
  }
}
