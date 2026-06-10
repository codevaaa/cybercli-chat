import UsageAnalytics from '../models/UsageAnalytics.js'
import User from '../models/User.js'

/**
 * Middleware to check if the user has enough tokens for the request
 * or has pay-as-you-go enabled.
 */
export const checkTokenLimit = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.supabase_id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: No user found for billing check.' });
    }

    const analytics = await UsageAnalytics.getOrCreate(userId);
    
    // Check if the month has rolled over
    const now = new Date();
    if (now > analytics.quota.resets_at) {
      const user = await User.findOne({ supabase_id: userId });
      const plan = user?.plan || 'free';
      
      let newLimit = 500000; // default free limit
      if (plan === 'pro') newLimit = 10000000;
      if (plan === 'max') newLimit = 25000000;
      
      await analytics.resetQuota(plan, newLimit);
    }

    const used = analytics.quota.tokens_used_this_month;
    const limit = analytics.quota.monthly_token_limit;
    const payAsYouGo = analytics.quota.pay_as_you_go_enabled;
    const userPlan = analytics.quota.plan || 'free';

    // Daily Request Limit Check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyEntry = analytics.daily_usage?.find(d => 
      new Date(d.date).getTime() === today.getTime()
    );
    const dailyRequests = dailyEntry ? dailyEntry.requests_count : 0;

    const FREE_DAILY_LIMIT = 50;
    
    if (userPlan === 'free' && dailyRequests >= FREE_DAILY_LIMIT) {
      const resetTime = new Date(today);
      resetTime.setDate(resetTime.getDate() + 1);
      
      res.setHeader('X-RateLimit-Limit', FREE_DAILY_LIMIT);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.floor(resetTime.getTime() / 1000));
      
      return res.status(429).json({
        error: {
          status: 429,
          message: 'Daily request limit exceeded. Upgrade your plan or wait until tomorrow.',
          code: 'DAILY_LIMIT_EXCEEDED',
          retry_after_seconds: Math.floor((resetTime.getTime() - Date.now()) / 1000)
        }
      });
    }

    // Set Rate Limit Headers for Free users
    if (userPlan === 'free') {
      const resetTime = new Date(today);
      resetTime.setDate(resetTime.getDate() + 1);
      res.setHeader('X-RateLimit-Limit', FREE_DAILY_LIMIT);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, FREE_DAILY_LIMIT - dailyRequests));
      res.setHeader('X-RateLimit-Reset', Math.floor(resetTime.getTime() / 1000));
    } else {
       // Pro/Enterprise users
       res.setHeader('X-RateLimit-Limit', 'Unlimited');
       res.setHeader('X-RateLimit-Remaining', 'Unlimited');
    }

    // Check if monthly token limit is reached
    if (used >= limit && !payAsYouGo && userPlan !== 'enterprise') {
      return res.status(403).json({
        error: 'Monthly token limit reached.',
        code: 'QUOTA_EXCEEDED',
        details: `You have used ${used} out of ${limit} tokens. Please enable pay-as-you-go or upgrade to a higher plan.`
      });
    }

    // Attach analytics to req for the orchestrator to update later
    req.usageAnalytics = analytics;

    // Add usage headers for the client
    const percentageUsed = (used / limit) * 100;
    res.setHeader('X-Tokens-Used', used);
    res.setHeader('X-Tokens-Limit', limit);
    
    if (percentageUsed >= 80 && !payAsYouGo) {
      res.setHeader('X-Quota-Warning', `You have used ${percentageUsed.toFixed(1)}% of your monthly token limit.`);
    }

    next();
  } catch (error) {
    console.error('Error in checkTokenLimit middleware:', error);
    res.status(500).json({ error: 'Internal server error while checking billing limits.' });
  }
};
