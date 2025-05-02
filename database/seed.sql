-- Seed data for testing the application

-- Insert test users
-- Default password is 'password123' (this is just for testing/development)
INSERT INTO users (user_id, username, email, password_hash)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'testuser', 'test@example.com', '$2b$10$Qx3axTFkJQHbCgpT87TW1uDQvtYYJUXZ.ZG.jyQ4x/TCPO9SzLbZm'),
    ('22222222-2222-2222-2222-222222222222', 'jane_dev', 'jane@example.com', '$2b$10$Qx3axTFkJQHbCgpT87TW1uDQvtYYJUXZ.ZG.jyQ4x/TCPO9SzLbZm'),
    ('33333333-3333-3333-3333-333333333333', 'markbuilder', 'mark@example.com', '$2b$10$Qx3axTFkJQHbCgpT87TW1uDQvtYYJUXZ.ZG.jyQ4x/TCPO9SzLbZm');

-- Insert sample projects for testuser
INSERT INTO projects (project_id, name, description, stage, github_url, domain, is_public, is_for_sale, sale_price, owner_id, owner_username)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Recipe App', 'A web application to manage recipes and shopping lists.', 'launched', 'https://github.com/testuser/recipe-app', 'recipe-finder.app', TRUE, FALSE, 0.00, '11111111-1111-1111-1111-111111111111', 'testuser'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Fitness Tracker', 'Track your workouts and fitness progress.', 'development', 'https://github.com/testuser/fitness-tracker', 'fit-track.io', FALSE, FALSE, 0.00, '11111111-1111-1111-1111-111111111111', 'testuser'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Blog Platform', 'A platform for creating and managing blogs.', 'mvp', 'https://github.com/testuser/blog-platform', 'easyblog.site', FALSE, TRUE, 499.99, '11111111-1111-1111-1111-111111111111', 'testuser');

-- Insert sample projects for jane_dev
INSERT INTO projects (project_id, name, description, stage, github_url, domain, is_public, is_for_sale, sale_price, owner_id, owner_username)
VALUES 
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Weather Dashboard', 'Weather forecasting app with beautiful visualizations.', 'launched', 'https://github.com/jane_dev/weather-app', 'forecast-daily.com', TRUE, FALSE, 0.00, '22222222-2222-2222-2222-222222222222', 'jane_dev'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Task Manager API', 'RESTful API for task management applications.', 'planning', 'https://github.com/jane_dev/task-manager-api', NULL, TRUE, FALSE, 0.00, '22222222-2222-2222-2222-222222222222', 'jane_dev'),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Expense Tracker', 'Mobile-first app to track personal expenses.', 'mvp', 'https://github.com/jane_dev/expense-tracker', 'budget-buddy.co', FALSE, TRUE, 349.99, '22222222-2222-2222-2222-222222222222', 'jane_dev');

-- Insert sample projects for markbuilder
INSERT INTO projects (project_id, name, description, stage, github_url, domain, is_public, is_for_sale, sale_price, owner_id, owner_username)
VALUES 
    ('99999999-9999-9999-9999-999999999999', 'Job Board', 'A specialized job board for developers.', 'launched', 'https://github.com/markbuilder/job-board', 'devhire.io', TRUE, FALSE, 0.00, '33333333-3333-3333-3333-333333333333', 'markbuilder'),
    ('88888888-8888-8888-8888-888888888888', 'Invoice Generator', 'Create professional invoices for freelancers.', 'development', 'https://github.com/markbuilder/invoice-gen', 'easy-invoice.net', TRUE, FALSE, 0.00, '33333333-3333-3333-3333-333333333333', 'markbuilder'),
    ('77777777-7777-7777-7777-777777777777', 'E-commerce Platform', 'Customizable e-commerce solution for small businesses.', 'launched', 'https://github.com/markbuilder/shop-system', 'shop-system.dev', FALSE, TRUE, 1299.99, '33333333-3333-3333-3333-333333333333', 'markbuilder');

-- Insert a sample transaction
INSERT INTO project_transactions (transaction_id, project_id, seller_id, buyer_id, amount, status, payment_method, payment_id)
VALUES 
    ('12345678-1234-1234-1234-123456789012', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 349.99, 'completed', 'stripe', 'pi_1234567890'); 