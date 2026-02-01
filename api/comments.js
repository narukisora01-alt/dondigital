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
      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      res.status(200).json({
        success: true,
        data: comments || []
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { commentText } = req.body;
      
      if (!commentText || commentText.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Comment text is required'
        });
      }

      if (commentText.length > 200) {
        return res.status(400).json({
          success: false,
          error: 'Comment must be 200 characters or less'
        });
      }
      
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            comment_text: commentText.trim(),
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(201).json({
        success: true,
        data: data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Comment ID is required'
        });
      }
      
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully'
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
