# Environment Variables Setup

This document explains how to set up the environment variables for the Insight Engine application, particularly for the email functionality.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

### Email Configuration (Required)

```env
# Gmail OAuth2 Configuration
GMAIL_USER=your-email@gmail.com
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground

# Application Configuration
BASE_URL=http://localhost:3000
NODEMAILER_FROM=your-email@gmail.com
```

## How to Get Google OAuth2 Credentials

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API

### 2. Create OAuth2 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `https://developers.google.com/oauthplayground`
   - `http://localhost:3000` (for development)
5. Save the Client ID and Client Secret

### 3. Get Refresh Token
1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. Click the settings icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. Close settings
6. Select "Gmail API v1" > "https://mail.google.com/"
7. Click "Authorize APIs"
8. Sign in with your Gmail account
9. Click "Exchange authorization code for tokens"
10. Copy the Refresh Token

### 4. Set Up Your Environment Variables

Replace the placeholder values in your `.env.local` file:

```env
GMAIL_USER=your-actual-gmail@gmail.com
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YourActualClientSecret
GOOGLE_REFRESH_TOKEN=1//04f0YourActualRefreshToken
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
BASE_URL=http://localhost:3000
NODEMAILER_FROM=your-actual-gmail@gmail.com
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit your `.env.local` file to version control**
2. **Keep your credentials secure and private**
3. **Use different credentials for development and production**
4. **Rotate your refresh token periodically**
5. **Monitor your Gmail API usage**

## Production Deployment

For production deployment (e.g., Vercel), set these environment variables in your hosting platform's dashboard:

- `GMAIL_USER`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_REDIRECT_URI`
- `BASE_URL` (your production URL)
- `NODEMAILER_FROM`

## Troubleshooting

### Common Issues:

1. **"Invalid credentials" error**
   - Verify your Client ID and Client Secret are correct
   - Ensure the Gmail API is enabled in your Google Cloud project

2. **"Refresh token expired" error**
   - Generate a new refresh token using the OAuth Playground
   - Update your environment variable

3. **"Quota exceeded" error**
   - Check your Gmail API usage in Google Cloud Console
   - Consider upgrading your Google Cloud project

4. **Emails not sending**
   - Verify your Gmail account has "Less secure app access" enabled
   - Check that your refresh token is valid
   - Ensure all environment variables are set correctly

## Support

If you encounter issues with email setup, check:
1. Google Cloud Console for API quotas and errors
2. Your application logs for detailed error messages
3. The Gmail API documentation for latest requirements 