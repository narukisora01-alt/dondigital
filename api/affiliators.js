import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // Check if requesting leaderboard view (new referral system)
      const useView = req.query.view === 'leaderboard';
      
      if (useView) {
        // Get top affiliators from the referral system view
        const limit = parseInt(req.query.limit) || 20;
        
        const { data: affiliators, error } = await supabase
          .from('vw_top_affiliators')
          .select('*')
          .limit(limit);
        
        if (error) throw error;
        
        // Format response to match expected structure
        const formattedAffiliators = (affiliators || []).map(aff => ({
          username: aff.username,
          referral_code: aff.referral_code,
          robux_earned: parseFloat(aff.total_robux_earned),
          total_clicks: aff.total_clicks,
          total_conversions: aff.total_conversions,
          conversion_rate: parseFloat(aff.conversion_rate || 0),
          created_at: aff.created_at
        }));
        
        res.status(200).json({
          success: true,
          data: formattedAffiliators
        });
      } else {
        // Original: Get top 20 affiliators ordered by robux earned (highest to lowest)
        const { data: affiliators, error } = await supabase
          .from('affiliators')
          .select('*')
          .order('robux_earned', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        
        res.status(200).json({
          success: true,
          data: affiliators || []
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { username, robux_earned, create_referral } = req.body;
      
      if (!username || username.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }

      if (robux_earned === undefined || robux_earned < 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid robux_earned amount is required'
        });
      }
      
      // If create_referral is true, use the new referral system
      if (create_referral) {
        // Generate referral code using stored function
        const { data: codeData, error: codeError } = await supabase
          .rpc('generate_referral_code', { username_input: username.trim() });
        
        if (codeError) {
          return res.status(500).json({
            success: false,
            error: 'Failed to generate referral code'
          });
        }
        
        const referralCode = codeData;
        
        // Check if affiliator already exists
        const { data: existing } = await supabase
          .from('affiliators')
          .select('*')
          .eq('username', username.trim())
          .single();
        
        if (existing) {
          return res.status(400).json({
            success: false,
            error: 'Affiliator already exists. Use PUT to update.'
          });
        }
        
        // Create new affiliator with referral system
        const { data, error } = await supabase
          .from('affiliators')
          .insert({
            username: username.trim(),
            referral_code: referralCode,
            total_robux_earned: robux_earned || 0,
            is_active: true
          })
          .select()
          .single();
        
        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({
              success: false,
              error: 'Username already exists'
            });
          }
          throw error;
        }
        
        return res.status(201).json({
          success: true,
          data: {
            username: data.username,
            referral_code: data.referral_code,
            robux_earned: parseFloat(data.total_robux_earned || 0),
            referral_link: `https://dondigital.vercel.app?ref=${data.referral_code}`
          },
          message: 'Affiliator created with referral system'
        });
      }
      
      // Original logic: Simple affiliator creation without referral system
      // Check if affiliator already exists
      const { data: existing } = await supabase
        .from('affiliators')
        .select('*')
        .eq('username', username.trim())
        .single();

      if (existing) {
        // Update existing affiliator
        const { data, error } = await supabase
          .from('affiliators')
          .update({
            robux_earned: (existing.robux_earned || 0) + robux_earned,
            total_robux_earned: (existing.total_robux_earned || 0) + robux_earned,
            updated_at: new Date().toISOString()
          })
          .eq('username', username.trim())
          .select()
          .single();
        
        if (error) throw error;
        
        res.status(200).json({
          success: true,
          data: data,
          message: 'Affiliator updated successfully'
        });
      } else {
        // Create new affiliator (simple version without referral code)
        const { data, error } = await supabase
          .from('affiliators')
          .insert({
            username: username.trim(),
            robux_earned: robux_earned,
            total_robux_earned: robux_earned,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        
        res.status(201).json({
          success: true,
          data: data,
          message: 'Affiliator created successfully'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { username, robux_earned, set_active } = req.body;
      
      if (!username || username.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }

      // Handle activating/deactivating affiliator
      if (set_active !== undefined) {
        const { data, error } = await supabase
          .from('affiliators')
          .update({
            is_active: set_active,
            updated_at: new Date().toISOString()
          })
          .eq('username', username.trim())
          .select()
          .single();
        
        if (error) throw error;
        
        return res.status(200).json({
          success: true,
          data: data,
          message: `Affiliator ${set_active ? 'activated' : 'deactivated'} successfully`
        });
      }

      if (robux_earned === undefined || robux_earned < 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid robux_earned amount is required'
        });
      }
      
      // Set the robux_earned to the exact amount (not add to existing)
      const { data, error } = await supabase
        .from('affiliators')
        .update({
          robux_earned: robux_earned,
          total_robux_earned: robux_earned,
          updated_at: new Date().toISOString()
        })
        .eq('username', username.trim())
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(200).json({
        success: true,
        data: data,
        message: 'Affiliator robux set successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { username } = req.query;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }
      
      const { error } = await supabase
        .from('affiliators')
        .delete()
        .eq('username', username);
      
      if (error) throw error;
      
      res.status(200).json({
        success: true,
        message: 'Affiliator deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
