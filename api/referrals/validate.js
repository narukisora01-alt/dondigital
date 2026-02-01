import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
  
  try {
    const { code } = req.query;
    
    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Referral code is required'
      });
    }
    
    const { data: affiliator, error } = await supabase
      .from('affiliators')
      .select('referral_code, username, is_active')
      .eq('referral_code', code.trim())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(200).json({
          success: true,
          valid: false,
          reason: 'Referral code not found'
        });
      }
      throw error;
    }
    
    if (!affiliator) {
      return res.status(200).json({
        success: true,
        valid: false,
        reason: 'Referral code not found'
      });
    }
    
    if (affiliator.is_active === false) {
      return res.status(200).json({
        success: true,
        valid: false,
        reason: 'Referral code is inactive'
      });
    }
    
    res.status(200).json({
      success: true,
      valid: true,
      username: affiliator.username
    });
    
  } catch (error) {
    console.error('Validate referral error:', error);
    res.status(500).json({
      success: false,
      valid: false,
      error: 'Internal server error'
    });
  }
}
