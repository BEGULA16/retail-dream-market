
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://kyhjxgsosrmbcymgqgir.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5aGp4Z3Nvc3JtYmN5bWdxZ2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTc1OTksImV4cCI6MjA2NDc5MzU5OX0.qzATShW2hCYNst4zG0dP9o5tW4nsjpnp-9q4LwU1kQM"

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
