import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('robux_amount', { ascending: true });

      if (productsError) throw productsError;

      const { data: stats, error: statsError } = await supabase
        .from('statistics')
        .select('current_robux')
        .single();

      if (statsError) throw statsError;

      const productsWithStock = products.map(product => ({
        ...product,
        in_stock: product.robux_amount <= stats.current_robux
      }));

      res.status(200).json({
        success: true,
        data: productsWithStock,
        currentRobux: stats.current_robux
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { tier, robuxAmount, price, priceLabel, icon } = req.body;

      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            tier: tier,
            robux_amount: robuxAmount,
            price: price,
            price_label: priceLabel,
            icon: icon || '⏣',
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
  } else if (req.method === 'PUT') {
    try {
      const { id, tier, robuxAmount, price, priceLabel, icon } = req.body;

      const { data, error } = await supabase
        .from('products')
        .update({
          tier: tier,
          robux_amount: robuxAmount,
          price: price,
          price_label: priceLabel,
          icon: icon,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
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
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
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
