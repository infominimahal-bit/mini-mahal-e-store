INSERT INTO email_templates (email_type, category, label, description, subject) VALUES
('abandoned_cart', 'customer', 'Abandoned Cart Reminder', 'Sent to customers who left items in cart', 'You left something behind at {{brand_name}}!'),
('admin_abandoned_cart', 'admin', 'Abandoned Cart Alert', 'Sent to admin when a cart is abandoned', 'Abandoned Cart - {{customer_name}}'),
('postex_shipped', 'customer', 'Order Shipped (PostEx)', 'Sent when order is fulfilled via PostEx', 'Your order is on the way via PostEx!'),
('admin_postex_shipped', 'admin', 'PostEx Fulfillment Alert', 'Sent to admin when order is pushed to PostEx', 'Order fulfilled via PostEx: #{{order_id}}')
ON CONFLICT (email_type) DO NOTHING;
