import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// SupabaseプロジェクトのURLとanon keyに置き換えてください
const supabaseUrl = 'https://vneeamxocalmixolqpay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZWVhbXhvY2FsbWl4b2xxcGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTI2NzAsImV4cCI6MjA2OTY4ODY3MH0.CPTEY4HFiV_2jc5VO7mn8peI0kiolEjXbNBwzGw-FWo';

export const supabase = createClient(supabaseUrl, supabaseKey);
