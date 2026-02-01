import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
  
  try {
    const { referralCode } = req.body;
    
    if (!referralCode || referralCode.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }
    
    const { data: affiliator, error: affiliatorError } = await supabase
      .from('affiliators')
      .select('referral_code, username, is_active')
      .eq('referral_code', referralCode.trim())
      .single();
    
    if (affiliatorError || !affiliator) {
      return res.status(404).json({
        success: false,
        error: 'Invalid referral code'
      });
    }
    
    if (affiliator.is_active === false) {
      return res.status(403).json({
        success: false,
        error: 'Referral code is inactive'
      });
    }
    
    const { error: clickError } = await supabase
      .from('referral_clicks')
      .insert({
        referral_code: referralCode.trim(),
        converted: false,
        clicked_at: new Date().toISOString()
      });
    
    if (clickError) {
      console.error('Click tracking error:', clickError);
      return res.status(200).json({
        success: true,
        message: 'Click recorded'
      });
    }
    
    await supabase.rpc('increment_affiliator_clicks', {
      ref_code: referralCode.trim()
    });
    
    res.status(200).json({
      success: true,
      message: 'Click tracked successfully'
    });
    
  } catch (error) {
    console.error('Track click error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
