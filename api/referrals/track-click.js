import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
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
    const { referralCode, robuxAmount, priceAmount } = req.body;
    
    // Validate input
    if (!referralCode || referralCode.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }

    if (!robuxAmount || robuxAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid Robux amount is required'
      });
    }

    if (!priceAmount || priceAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid price amount is required'
      });
    }

    // Get IP address
    const ipAddress = req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress || 
                      'unknown';
    
    // Get affiliator by referral code
    const { data: affiliator, error: affiliatorError } = await supabase
      .from('affiliators')
      .select('id, referral_code, username')
      .eq('referral_code', referralCode.trim())
      .eq('is_active', true)
      .single();
    
    if (affiliatorError || !affiliator) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or inactive referral code'
      });
    }
    
    // Calculate 10% commission in Robux
    const commissionRate = 10.00;
    const commissionRobux = robuxAmount * (commissionRate / 100);
    
    // Insert conversion record (trigger will auto-update total_conversions and total_robux_earned)
    const { data: conversion, error: conversionError } = await supabase
      .from('referral_conversions')
      .insert({
        affiliator_id: affiliator.id,
        referral_code: referralCode.trim(),
        robux_amount: robuxAmount,
        price_php: priceAmount,
        commission_robux: commissionRobux,
        commission_rate: commissionRate,
        ip_address: ipAddress
      })
      .select()
      .single();
    
    if (conversionError) {
      console.error('Conversion tracking error:', conversionError);
      return res.status(500).json({
        success: false,
        error: 'Failed to track conversion'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Conversion tracked successfully',
        affiliator: affiliator.username,
        commission_robux: commissionRobux,
        commission_rate: commissionRate
      }
    });
    
  } catch (error) {
    console.error('Track conversion error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
