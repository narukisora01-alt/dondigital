import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('statistics')
        .select('*')
        .single();

      if (error) throw error;

      res.status(200).json({
        success: true,
        data: data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { currentRobux, operatingHoursStart, operatingHoursEnd } = req.body;

      const { data, error } = await supabase
        .from('statistics')
        .update({
          current_robux: currentRobux,
          operating_hours_start: operatingHoursStart,
          operating_hours_end: operatingHoursEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({
        success: true,
        data: data
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
