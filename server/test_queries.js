const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const supabase = require('./src/db');

async function checkData() {
  const { data: users, error: ue } = await supabase.from('users').select('*').eq('role', 'DRIVER');
  console.log("Users with role DRIVER:", users?.length, ue || "");

  const { data: drivers, error: de } = await supabase.from('drivers').select('*');
  console.log("Total drivers:", drivers?.length, de || "");
  console.log("Drivers details:", drivers);

  // Test the actual query
  const { data: joinData, error: je } = await supabase
    .from('drivers')
    .select(`
      id,
      user_id,
      users!inner(
        full_name, email, phone, phone_verified, role,
        user_locations!left(is_visible)
      )
    `)
    .eq('users.role', 'DRIVER');
  
  console.log("Join data length:", joinData?.length);
  if (je) console.error("Join error:", je);
}

checkData();
