# 🚀 Run Email Migration - Step by Step

## ✅ **The migration file is already correct!** 

The file `supabase/migrations/0039_email_integration.sql` has all the right columns that match your API.

---

## 📋 **How to Run It (Supabase Dashboard)**

### **Step 1: Open Supabase Dashboard**

1. Go to: https://supabase.com/dashboard
2. Sign in
3. Click on your **CaseBrain project**

### **Step 2: Open SQL Editor**

1. Click **SQL Editor** in the left sidebar
2. Click **New query** (top right)

### **Step 3: Copy the Migration**

1. Open the file: `supabase/migrations/0039_email_integration.sql`
2. **Select ALL** (Ctrl+A)
3. **Copy** (Ctrl+C)

### **Step 4: Paste and Run**

1. Paste into the SQL Editor
2. Click **Run** (or press Ctrl+Enter)
3. Wait for success message ✅

### **Step 5: Verify**

Run this query to check:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('emails', 'email_accounts', 'email_threads', 'email_attachments')
ORDER BY table_name;
```

You should see all 4 tables listed.

### **Step 6: Test Email**

1. Refresh your browser
2. Try sending an email again
3. It should work! 🎉

---

## ⚠️ **If You Get Errors**

- **"relation already exists"** → Tables already exist, that's fine! Skip this migration.
- **"permission denied"** → Make sure you're using the right Supabase project
- **"syntax error"** → Check you copied the entire file

---

## 🎯 **Quick Copy-Paste**

The migration file is at:
```
supabase/migrations/0039_email_integration.sql
```

Just copy the entire contents and paste into Supabase SQL Editor!

