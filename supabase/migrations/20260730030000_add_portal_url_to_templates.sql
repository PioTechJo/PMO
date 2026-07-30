-- Add the portal login link ({{portal_url}}, filled from the PORTAL_URL
-- edge function secret) to the invite and password-reset email bodies.

update public.email_templates
set body_template = E'Hello {{name}},\n\nAn account has been created for you on the Projects Portfolio Portal.\n\nPortal: {{portal_url}}\nEmail: {{email}}\nTemporary Password: {{temp_password}}\n\nPlease log in and change your password as soon as possible.'
where trigger_key = 'USER_INVITED';

update public.email_templates
set body_template = E'Hello,\n\nYour password has been reset.\n\nPortal: {{portal_url}}\nEmail: {{email}}\nNew Password: {{temp_password}}\n\nPlease log in and change your password as soon as possible.'
where trigger_key = 'PASSWORD_RESET';
