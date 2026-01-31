import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
        in_stock: product.robux_amount <= stats.current_robux,
        total_sales: product.total_sales || 0
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
      const { tier, robuxAmount, price, priceLabel, icon, totalSales } = req.body;
      
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            tier: tier,
            robux_amount: robuxAmount,
            price: price,
            price_label: priceLabel,
            icon: icon || '⏣',
            total_sales: totalSales || 0,
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
      const { id, tier, robuxAmount, price, priceLabel, icon, totalSales } = req.body;
      
      const updateData = {
        tier: tier,
        robux_amount: robuxAmount,
        price: price,
        price_label: priceLabel,
        icon: icon,
        updated_at: new Date().toISOString()
      };

      // Only update total_sales if it's provided
      if (totalSales !== undefined) {
        updateData.total_sales = totalSales;
      }
      
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
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
  } else if (req.method === 'PATCH') {
    // Endpoint specifically for updating total_sales
    try {
      const { id, totalSales } = req.body;
      
      if (!id || totalSales === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Product ID and totalSales are required'
        });
      }
      
      const { data, error } = await supabase
        .from('products')
        .update({
          total_sales: totalSales,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(200).json({
        success: true,
        data: data,
        message: 'Total sales updated successfully'
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
