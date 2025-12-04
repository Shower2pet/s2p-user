-- Create stations table for managing dog wash stations
CREATE TABLE public.stations (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'offline')),
  price_per_session DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  currency TEXT NOT NULL DEFAULT '€',
  stripe_price_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (everyone can see stations)
CREATE POLICY "Anyone can view stations" 
ON public.stations 
FOR SELECT 
USING (true);

-- Create policy for service role to manage stations
CREATE POLICY "Service role can manage stations" 
ON public.stations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stations_updated_at
BEFORE UPDATE ON public.stations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial test stations
INSERT INTO public.stations (id, name, location, address, lat, lng, status, price_per_session, duration_minutes, currency, stripe_price_id)
VALUES 
  ('test1', 'Doccia Bracco', 'Camping del Sole', 'Via Roma 123, Milano', 45.4642, 9.1900, 'available', 1.00, 5, '€', 'price_1SahdbGzJdGfXoSntBByabU6'),
  ('test2', 'Doccia Luna', 'Parco Centrale', 'Via Verdi 45, Milano', 45.4700, 9.1850, 'available', 2.00, 10, '€', 'price_1SahdbGzJdGfXoSntBByabU6'),
  ('test3', 'Doccia Stella', 'Centro Commerciale Nord', 'Via Milano 78, Monza', 45.5845, 9.2744, 'busy', 1.50, 5, '€', 'price_1SahdbGzJdGfXoSntBByabU6');