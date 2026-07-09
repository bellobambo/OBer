const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY // Use the service role key to bypass RLS in the server
);

// Mock pool methods used by controllers to prevent crashes on BEGIN/COMMIT
supabase.connect = async () => {
  return {
    query: async () => {},
    release: () => {}
  };
};

module.exports = supabase;
