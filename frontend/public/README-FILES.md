# Place your files here

## Logo
- **File:** `logo.png`
- **Location:** `frontend/public/logo.png`
- **Usage:** Shown on invoices and in print. If the file is missing, the company name is shown instead.

## Payment QR Code
- **File:** `payment-qr.png`
- **Location:** `frontend/public/payment-qr.png`
- **Usage:** Shown at checkout when the customer clicks "Proceed to Pay". Scan to pay the order amount.

## Bank/UPI Details
- **File:** `payment-config.json`
- **Location:** `frontend/public/payment-config.json`
- Edit this file to add your bank or UPI details. Example:
```json
{
  "account_no": "123456789012",
  "bank_name": "Your Bank Name",
  "upi_id": "yourupi@bank",
  "account_holder": "Your Name"
}
```
These appear below the QR at checkout.

## Order Emails
- Go to **Gmail for Orders** in the sidebar (next to the theme toggle).
- Add your Gmail App Password so order notifications (accepted, rejected, shipped, completed) are sent from your login email.
- Get an App Password: Google Account → Security → 2-Step Verification → App passwords.
