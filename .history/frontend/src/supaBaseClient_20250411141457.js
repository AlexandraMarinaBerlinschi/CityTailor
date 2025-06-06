import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rokghrvqbznglgowksgf.supabase.co'
const supabaseKey = '<PUBLIC_ANON_KEY>' // îl găsești în Supabase > Project Settings > API > anon key

export const supabase = createClient(supabaseUrl, supabaseKey)
