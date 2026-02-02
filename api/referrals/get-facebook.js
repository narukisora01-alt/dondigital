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
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Referral code required'
      });
    }
    
    const { data, error } = await supabase
      .from('affiliators')
      .select('facebook_profile')
      .eq('referral_code', code.trim())
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Affiliator not found'
      });
    }
    
    res.status(200).json({
      success: true,
      facebook_profile: data.facebook_profile || null
    });
    
  } catch (error) {
    console.error('Get Facebook error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
