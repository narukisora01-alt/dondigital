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
      // Get top 20 affiliators ordered by robux earned (highest to lowest)
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
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { username, robux_earned } = req.body;
      
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
            robux_earned: existing.robux_earned + robux_earned,
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
        // Create new affiliator
        const { data, error } = await supabase
          .from('affiliators')
          .insert([
            {
              username: username.trim(),
              robux_earned: robux_earned,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
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
      const { username, robux_earned } = req.body;
      
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
      
      // Set the robux_earned to the exact amount (not add to existing)
      const { data, error } = await supabase
        .from('affiliators')
        .update({
          robux_earned: robux_earned,
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
