# Fixes Applied - Time Tracking, Billing, Email, SMS

## ✅ What Was Fixed

### 1. **Time Tracking** ✅
- **Issue:** Database schema mismatch (`org_id` was UUID instead of TEXT)
- **Fix:** Created migration `0049_fix_time_tracking_billing.sql` that:
  - Converts `time_entries.org_id` from UUID to TEXT
  - Fixes `activity_type` values to match code expectations
  - Adds missing columns (`is_billable`, `is_billed`, `status`, etc.)
  - Adds proper triggers for duration calculation
  - Adds missing indexes

**To apply:** Run the migration:
```sql
\i supabase/migrations/0049_fix_time_tracking_billing.sql
```

### 2. **Billing/Invoicing** ✅
- **Issue:** Invoice calculations not working, missing triggers
- **Fix:** Added triggers and functions in migration `0049_fix_time_tracking_billing.sql`:
  - `calculate_invoice_totals()` - Calculates subtotal, tax, total
  - `recalculate_invoice_on_line_item_change()` - Recalculates when line items change
  - Ensures invoice number generation works

**To apply:** Same migration as above

### 3. **Email Sending** ✅
- **Issue:** Emails were stored but never actually sent
- **Fix:** 
  - Created `lib/email/smtp.ts` with support for:
    - SendGrid
    - Resend
    - AWS SES (placeholder)
    - Generic SMTP (placeholder)
  - Updated `app/api/email/send/route.ts` to actually send emails

**Configuration needed:**
```env
# Choose one provider:
EMAIL_PROVIDER=sendgrid  # or "resend" or "ses" or "smtp"

# For SendGrid:
SENDGRID_API_KEY=your_sendgrid_api_key

# For Resend:
RESEND_API_KEY=your_resend_api_key

# Default from address (if no email account configured):
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=Your Firm Name
```

### 4. **SMS/WhatsApp Sending** ✅
- **Issue:** Messages were stored but never actually sent, no phone number linking
- **Fix:**
  - Rewrote `lib/sms/twilio.ts` with full Twilio API integration
  - Updated `app/api/sms/send/route.ts` to actually send messages
  - Added phone number formatting for UK numbers

**Configuration needed:**
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+441234567890  # Your Twilio phone number
TWILIO_WHATSAPP_NUMBER=whatsapp:+441234567890  # Optional, for WhatsApp
```

## 📋 Next Steps

### 1. Run the Database Migration
```bash
# Connect to your Supabase database and run:
\i supabase/migrations/0049_fix_time_tracking_billing.sql
```

### 2. Configure Email Provider
Choose one email provider and add the required environment variables (see above).

**Recommended:** Start with **Resend** - it's the easiest to set up:
1. Sign up at https://resend.com
2. Get your API key
3. Add to `.env.local`:
   ```
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxx
   DEFAULT_FROM_EMAIL=noreply@yourdomain.com
   ```

### 3. Configure Twilio (for SMS/WhatsApp)
1. Sign up at https://twilio.com
2. Get Account SID and Auth Token
3. Get a phone number (or use WhatsApp sandbox for testing)
4. Add to `.env.local`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_PHONE_NUMBER=+441234567890
   ```

### 4. Test Everything
1. **Time Tracking:** Try starting/stopping a timer on a case
2. **Billing:** Create an invoice from time entries
3. **Email:** Send a test email from a case
4. **SMS:** Send a test SMS (use Twilio sandbox number for testing)

## ⚠️ Important Notes

1. **Time Tracking:** The migration will convert existing `org_id` values from UUID to TEXT. Make sure to backup your database first.

2. **Email:** If you don't configure an email provider, emails will still be stored in the database but won't actually send. The API will return an error.

3. **SMS/WhatsApp:** If you don't configure Twilio, SMS/WhatsApp will still be stored but won't actually send. The API will return an error.

4. **Billing:** Invoice calculations now happen automatically via triggers. Make sure the migration runs successfully.

## 🐛 If Something Doesn't Work

1. **Time Tracking not working:**
   - Check if migration `0049` ran successfully
   - Check database logs for errors
   - Verify `time_entries` table has `org_id` as TEXT type

2. **Email not sending:**
   - Check environment variables are set correctly
   - Check email provider API key is valid
   - Check console logs for error messages
   - Verify `EMAIL_PROVIDER` is set to a supported value

3. **SMS not sending:**
   - Check Twilio credentials are correct
   - Verify phone number format (should start with +)
   - Check Twilio console for error messages
   - For testing, use Twilio sandbox numbers

4. **Billing calculations wrong:**
   - Check if triggers are installed (run migration again)
   - Verify `invoice_line_items` are being created
   - Check database logs for trigger errors

