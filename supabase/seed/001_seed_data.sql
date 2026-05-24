-- Seed data for development/testing

-- Insert sample repair guides
INSERT INTO public.guides (title, content, guide_type, device_type, url) VALUES
    ('Screen Repair Guide', 'Step-by-step guide for repairing smartphone screens', 'repair', 'smartphone', 'https://example.com/guides/screen-repair'),
    ('Battery Replacement Guide', 'How to safely replace your smartphone battery', 'repair', 'smartphone', 'https://example.com/guides/battery-replace'),
    ('Motherboard Repair Guide', 'Advanced guide for laptop motherboard repairs', 'repair', 'laptop', 'https://example.com/guides/motherboard-repair'),
    ('Data Wipe Guide for Smartphones', 'Complete guide to securely wipe data from your smartphone', 'data_wipe', 'smartphone', 'https://example.com/guides/data-wipe-phone'),
    ('Data Wipe Guide for Laptops', 'Secure data deletion procedures for laptops', 'data_wipe', 'laptop', 'https://example.com/guides/data-wipe-laptop'),
    ('Electronics Recycling Guide', 'How to properly recycle electronic waste', 'recycle', NULL, 'https://example.com/guides/recycle-electronics')
ON CONFLICT DO NOTHING;

-- Insert sample shops (unverified initially)
INSERT INTO public.shops (name, address, latitude, longitude, phone, website, hours, brands_serviced, type, is_verified) VALUES
    ('TechFix Manila', '123 Tech Plaza, Makati City', 14.5547, 121.0244, '+632 8888 1234', 'https://techfixmanila.com', '8:00 AM - 6:00 PM', ARRAY['Apple', 'Samsung', 'Xiaomi'], 'repair', false),
    ('GadgetMD Quezon City', '456 Gadget Center, Quezon City', 14.6760, 121.0437, '+632 8777 5678', 'https://gadgetmdqc.com', '9:00 AM - 7:00 PM', ARRAY['Samsung', 'OPPO', 'Vivo', 'Huawei'], 'repair', false),
    ('PC Hospital Cebu', '789 Computer Mall, Cebu City', 10.3157, 123.8854, '+6332 234 5678', 'https://pchospitalcebu.com', '8:00 AM - 6:00 PM', ARRAY['Dell', 'HP', 'Lenovo'], 'repair', false),
    ('EcoPhone Repair', '321 Ayala Mall, Makati City', 14.5583, 121.0251, '+632 8901 2345', 'https://ecophonerepair.com', '10:00 AM - 8:00 PM', ARRAY['Apple', 'Samsung'], 'repair', false),
    ('FixIt Philippines', '654 Ortigas Center, Pasig City', 14.5806, 121.0716, '+632 8456 7890', 'https://fixitphilippines.com', '9:00 AM - 7:00 PM', ARRAY['Xiaomi', 'OPPO', 'Vivo'], 'repair', false)
ON CONFLICT DO NOTHING;

-- Insert sample facilities (unverified initially)
INSERT INTO public.facilities (name, address, latitude, longitude, phone, website, hours, accepted_items, certifications, type, is_verified) VALUES
    ('GreenTech Recycling', '789 Eco Avenue, Taguig City', 14.5160, 121.0515, '+632 8321 0987', 'https://greentechrecycling.ph', '8:00 AM - 5:00 PM', ARRAY['Smartphones', 'Laptops', 'Tablets', 'Accessories'], ARRAY['DENR Accredited', 'ISO 14001'], 'recycling', false),
    ('E-Waste Solutions Philippines', '321 Industrial Park, Pasig City', 14.5764, 121.0687, '+632 8765 4321', 'https://ewastesolutions.ph', '7:00 AM - 6:00 PM', ARRAY['Computers', 'Monitors', 'Printers', 'Network Equipment'], ARRAY['DENR Accredited', 'R2 Certified'], 'recycling', false),
    ('Metro Manila E-Waste Facility', '654 Quezon Avenue, Quezon City', 14.6434, 121.0324, '+632 8987 6543', 'https://mmlewaste.ph', '8:00 AM - 5:00 PM', ARRAY['All Electronics'], ARRAY['DENR Accredited'], 'recycling', false)
ON CONFLICT DO NOTHING;